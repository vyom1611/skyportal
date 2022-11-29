# Inspired by https://github.com/growth-astro/growth-too-marshal/blob/main/growth/too/gcn.py

import base64
import os
import numpy as np
import scipy
import healpy as hp
import gcn
import tempfile
from urllib.parse import urlparse

import astropy.units as u
from astropy.table import Table
from astropy.time import Time
from astropy.coordinates import SkyCoord

from astropy.coordinates import ICRS
from astropy_healpix import HEALPix, nside_to_level, pixel_resolution_to_nside
import ligo.skymap.io
import ligo.skymap.postprocess
import ligo.skymap.moc
import ligo.skymap.bayestar as ligo_bayestar


def get_trigger(root):
    """Get the trigger ID from a GCN notice."""

    property_name = "TrigID"
    path = f".//Param[@name='{property_name}']"
    elem = root.find(path)
    if elem is None:
        return None
    value = elem.attrib.get('value', None)
    if value is not None:
        value = int(value)

    return value


def get_dateobs(root):
    """Get the UTC event time from a GCN notice, rounded to the nearest second,
    as a datetime.datetime object."""
    dateobs = Time(
        root.find(
            "./WhereWhen/{*}ObsDataLocation"
            "/{*}ObservationLocation"
            "/{*}AstroCoords"
            "[@coord_system_id='UTC-FK5-GEO']"
            "/Time/TimeInstant/ISOTime"
        ).text,
        precision=0,
    )

    # FIXME: https://github.com/astropy/astropy/issues/7179
    dateobs = Time(dateobs.iso)

    return dateobs.datetime


def get_tags(root):
    """Get source classification tag strings from GCN notice."""
    # Get event stream.
    mission = urlparse(root.attrib['ivorn']).path.lstrip('/')
    yield mission

    # What type of burst is this: GRB or GW?
    try:
        value = root.find("./Why/Inference/Concept").text
    except AttributeError:
        pass
    else:
        if value == 'process.variation.burst;em.gamma':
            # Is this a GRB at all?
            try:
                value = root.find(".//Param[@name='GRB_Identified']").attrib['value']
            except AttributeError:
                yield 'GRB'
            else:
                if value == 'false':
                    yield 'Not GRB'
                else:
                    yield 'GRB'
        elif value == 'process.variation.trans;em.gamma':
            yield 'transient'

    # LIGO/Virgo alerts don't provide the Why/Inference/Concept tag,
    # so let's just identify it as a GW event based on the notice type.
    notice_type = gcn.get_notice_type(root)
    if notice_type in {
        gcn.NoticeType.LVC_PRELIMINARY,
        gcn.NoticeType.LVC_INITIAL,
        gcn.NoticeType.LVC_UPDATE,
        gcn.NoticeType.LVC_RETRACTION,
    }:
        yield 'GW'
    elif notice_type in {
        gcn.NoticeType.ICECUBE_ASTROTRACK_GOLD,
        gcn.NoticeType.ICECUBE_ASTROTRACK_BRONZE,
    }:
        yield 'Neutrino'
        yield 'IceCube'

    if notice_type == gcn.NoticeType.ICECUBE_ASTROTRACK_GOLD:
        yield 'Gold'
    elif notice_type == gcn.NoticeType.ICECUBE_ASTROTRACK_BRONZE:
        yield 'Bronze'

    # Is this a retracted LIGO/Virgo event?
    if notice_type == gcn.NoticeType.LVC_RETRACTION:
        yield 'retracted'

    # Is this a short GRB, or a long GRB?
    try:
        value = root.find(".//Param[@name='Long_short']").attrib['value']
    except AttributeError:
        pass
    else:
        if value != 'unknown':
            yield value.lower()

    # Gaaaaaah! Alerts of type FERMI_GBM_SUBTHRESH store the
    # classification in a different property!
    try:
        value = root.find(".//Param[@name='Duration_class']").attrib['value'].title()
    except AttributeError:
        pass
    else:
        if value != 'unknown':
            yield value.lower()

    # Get LIGO/Virgo source classification, if present.
    classifications = [
        (float(elem.attrib['value']), elem.attrib['name'])
        for elem in root.iterfind("./What/Group[@type='Classification']/Param")
    ]
    if classifications:
        _, classification = max(classifications)
        yield classification

    search = root.find("./What/Param[@name='Search']")
    if search is not None:
        yield search.attrib['value']

    # Get Instruments, if present.
    try:
        value = root.find(".//Param[@name='Instruments']").attrib['value']
    except AttributeError:
        pass
    else:
        instruments = value.split(",")
        yield from instruments


def get_skymap(root, gcn_notice):
    mission = urlparse(root.attrib['ivorn']).path.lstrip('/')

    # Try Fermi GBM convention
    if gcn_notice.notice_type == gcn.NoticeType.FERMI_GBM_FIN_POS:
        url = root.find("./What/Param[@name='LocationMap_URL']").attrib['value']
        url = url.replace('http://', 'https://')
        url = url.replace('_locplot_', '_healpix_')
        url = url.replace('.png', '.fit')
        return from_url(url)

    # Try Fermi GBM **subthreshold** convention. Stupid, stupid, stupid!!
    if gcn_notice.notice_type == gcn.NoticeType.FERMI_GBM_SUBTHRESH:
        url = root.find("./What/Param[@name='HealPix_URL']").attrib['value']
        return from_url(url)

    # Try LVC convention
    skymap = root.find("./What/Group[@type='GW_SKYMAP']")
    if skymap is not None:
        children = skymap.getchildren()
        for child in children:
            if child.attrib['name'] == 'skymap_fits':
                url = child.attrib['value']
                break

        return from_url(url)

    retraction = root.find("./What/Param[@name='Retraction']")
    if retraction is not None:
        retraction = int(retraction.attrib['value'])
        if retraction == 1:
            return None

    # Try error cone
    loc = root.find('./WhereWhen/ObsDataLocation/ObservationLocation')
    if loc is None:
        return None

    ra = loc.find('./AstroCoords/Position2D/Value2/C1')
    dec = loc.find('./AstroCoords/Position2D/Value2/C2')
    error = loc.find('./AstroCoords/Position2D/Error2Radius')

    if None in (ra, dec, error):
        return None

    ra, dec, error = float(ra.text), float(dec.text), float(error.text)

    # Apparently, all experiments *except* AMON report a 1-sigma error radius.
    # AMON reports a 90% radius, so for AMON, we have to convert.
    if mission == 'AMON':
        error /= scipy.stats.chi(df=2).ppf(0.95)

    return from_cone(ra, dec, error)


def get_properties(root):

    property_names = [
        # Gravitational waves
        "HasNS",
        "HasRemnant",
        "FAR",
        "BNS",
        "NSBH",
        "BBH",
        "MassGap",
        "Terrestrial",
        # GRBs
        "Burst_Signif",
        "Data_Signif",
        "Det_Signif",
        "Image_Signif",
        "Rate_Signif",
        "Trig_Signif",
        "Burst_Inten",
        "Burst_Peak",
        "Data_Timescale",
        "Data_Integ",
        "Integ_Time",
        "Trig_Timescale",
        "Trig_Dur",
        "Hardness_Ratio",
        # Neutrinos
        "signalness",
        "energy",
    ]
    property_dict = {}
    for property_name in property_names:
        path = f".//Param[@name='{property_name}']"
        elem = root.find(path)
        if elem is None:
            continue
        value = elem.attrib.get('value', None)
        if value is not None:
            value = float(value)
            property_dict[property_name] = value

    return property_dict


def from_cone(ra, dec, error):
    localization_name = f"{ra:.5f}_{dec:.5f}_{error:.5f}"

    center = SkyCoord(ra * u.deg, dec * u.deg)
    radius = error * u.deg

    # Determine resolution such that there are at least
    # 16 pixels across the error radius.
    hpx = HEALPix(
        pixel_resolution_to_nside(radius / 16, round='up'), 'nested', frame=ICRS()
    )

    # Find all pixels in the 4-sigma error circle.
    ipix = hpx.cone_search_skycoord(center, 4 * radius)

    # Convert to multi-resolution pixel indices and sort.
    uniq = ligo.skymap.moc.nest2uniq(nside_to_level(hpx.nside), ipix.astype(np.int64))
    i = np.argsort(uniq)
    ipix = ipix[i]
    uniq = uniq[i]

    # Evaluate Gaussian.
    distance = hpx.healpix_to_skycoord(ipix).separation(center)
    probdensity = np.exp(
        -0.5 * np.square(distance / radius).to_value(u.dimensionless_unscaled)
    )
    probdensity /= probdensity.sum() * hpx.pixel_area.to_value(u.steradian)

    skymap = {
        'localization_name': localization_name,
        'uniq': uniq.tolist(),
        'probdensity': probdensity.tolist(),
    }

    return skymap


def from_polygon(localization_name, polygon):

    xyz = [hp.ang2vec(r, d, lonlat=True) for r, d in polygon]
    hpx = HEALPix(1024, 'nested', frame=ICRS())
    ipix = hp.query_polygon(hpx.nside, np.array(xyz), nest=True)

    # Convert to multi-resolution pixel indices and sort.
    uniq = ligo.skymap.moc.nest2uniq(nside_to_level(hpx.nside), ipix.astype(np.int64))
    i = np.argsort(uniq)
    ipix = ipix[i]
    uniq = uniq[i]

    # Evaluate Gaussian.
    probdensity = 1.0 * np.ones(ipix.shape)
    probdensity /= probdensity.sum() * hpx.pixel_area.to_value(u.steradian)

    skymap = {
        'localization_name': localization_name,
        'uniq': uniq.tolist(),
        'probdensity': probdensity.tolist(),
    }

    return skymap


def from_bytes(arr):
    def get_col(m, name):
        try:
            col = m[name]
        except KeyError:
            return None
        else:
            return col.tolist()

    with tempfile.NamedTemporaryFile(suffix=".fits.gz", mode="wb") as f:
        arrSplit = arr.split('base64,')
        filename = arrSplit[0].split("name=")[-1].replace(";", "")
        f.write(base64.b64decode(arrSplit[-1]))
        f.flush()

        skymap = ligo.skymap.io.read_sky_map(f.name, moc=True)

        nside = 128
        occulted = get_occulted(f.name, nside=nside)
        if occulted is not None:
            order = hp.nside2order(nside)
            skymap_flat = ligo_bayestar.rasterize(skymap, order)['PROB']
            skymap_flat = hp.reorder(skymap_flat, 'NESTED', 'RING')
            skymap_flat[occulted] = 0.0
            skymap_flat = skymap_flat / skymap_flat.sum()
            skymap_flat = hp.reorder(skymap_flat, 'RING', 'NESTED')
            skymap = ligo_bayestar.derasterize(Table([skymap_flat], names=['PROB']))

        skymap = {
            'localization_name': filename,
            'uniq': get_col(skymap, 'UNIQ'),
            'probdensity': get_col(skymap, 'PROBDENSITY'),
            'distmu': get_col(skymap, 'DISTMU'),
            'distsigma': get_col(skymap, 'DISTSIGMA'),
            'distnorm': get_col(skymap, 'DISTNORM'),
        }

    return skymap


def get_occulted(url, nside=64):

    m = Table.read(url, format='fits')
    ra = m.meta.get('GEO_RA', None)
    dec = m.meta.get('GEO_DEC', None)
    error = m.meta.get('GEO_RAD', 67.5)

    if (ra is None) or (dec is None) or (error is None):
        return None

    center = SkyCoord(ra * u.deg, dec * u.deg)
    radius = error * u.deg

    hpx = HEALPix(nside, 'ring', frame=ICRS())

    # Find all pixels in the circle.
    ipix = hpx.cone_search_skycoord(center, radius)

    return ipix


def from_url(url):
    def get_col(m, name):
        try:
            col = m[name]
        except KeyError:
            return None
        else:
            return col.tolist()

    filename = os.path.basename(urlparse(url).path)

    skymap = ligo.skymap.io.read_sky_map(url, moc=True)

    nside = 128
    occulted = get_occulted(url, nside=nside)
    if occulted is not None:
        order = hp.nside2order(nside)
        skymap_flat = ligo_bayestar.rasterize(skymap, order)['PROB']
        skymap_flat = hp.reorder(skymap_flat, 'NESTED', 'RING')
        skymap_flat[occulted] = 0.0
        skymap_flat = skymap_flat / skymap_flat.sum()
        skymap_flat = hp.reorder(skymap_flat, 'RING', 'NESTED')
        skymap = ligo_bayestar.derasterize(Table([skymap_flat], names=['PROB']))

    skymap = {
        'localization_name': filename,
        'uniq': get_col(skymap, 'UNIQ'),
        'probdensity': get_col(skymap, 'PROBDENSITY'),
        'distmu': get_col(skymap, 'DISTMU'),
        'distsigma': get_col(skymap, 'DISTSIGMA'),
        'distnorm': get_col(skymap, 'DISTNORM'),
    }

    return skymap


def get_contour(localization):

    # Calculate credible levels.
    prob = localization.flat_2d
    cls = 100 * ligo.skymap.postprocess.find_greedy_credible_levels(prob)

    # Construct contours and return as a GeoJSON feature collection.
    levels = [50, 90]
    paths = ligo.skymap.postprocess.contour(cls, levels, degrees=True, simplify=True)
    center = ligo.skymap.postprocess.posterior_max(prob)
    localization.contour = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [center.ra.deg, center.dec.deg],
                },
                'properties': {'credible_level': 0},
            }
        ]
        + [
            {
                'type': 'Feature',
                'properties': {'credible_level': level},
                'geometry': {'type': 'MultiLineString', 'coordinates': path},
            }
            for level, path in zip(levels, paths)
        ],
    }

    return localization
