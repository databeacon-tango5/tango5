'use client';

import { useState, useEffect, type PropsWithChildren, CSSProperties, useMemo } from 'react';
import MapGL, { MapProvider, Layer, Source, useMap } from 'react-map-gl';
import type { FeatureCollection } from 'geojson';
import { Flight } from '~/lib/domain/flight';
import { featureCollection as featureCollection } from '~/lib/domain/geojson';
import { Scenario, View } from '~/lib/domain/scenario';
import { MapEvent, MapMouseEvent } from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

type ScenarioMapProps = {
    style?: CSSProperties;
    scenario: Scenario;
    onSelectPair?: (pair: [string, string]) => void;
    selectedPairs: [string, string][];
};

const ScenarioMap = (props: PropsWithChildren<ScenarioMapProps>) => {
    const [view, setView] = useState(props.scenario.view);

    const [selectedFlight, setSelectedFlight] = useState<string | null>(null);

    const flights = useMemo(
        () =>
            props.scenario.flights.map(
                (item) =>
                    new Flight(
                        item.id,
                        item.latitudeDeg,
                        item.longitudeDeg,
                        item.callsign,
                        item.category,
                        item.groundSpeedKts,
                        item.trackDeg,
                        item.altitudeFt,
                        item.verticalSpeedFtpm,
                        item.selectedAltitudeFt
                    )
            ),
        [props.scenario.flights]
    );

    const onClick = (e: MapMouseEvent) => {
        const id = e.features?.at(0)?.properties?.ref;
        if (!id) return;

        const flight = flights.find((flight) => flight.id === id);
        if (!flight) return;

        if (selectedFlight) {
            // avoid selecting the same flight two times on the same pair
            if (selectedFlight !== flight.id) {
                props.onSelectPair?.([selectedFlight, flight.id]);
            }

            setSelectedFlight(null);
        } else {
            setSelectedFlight(flight.id);
        }
    };

    return (
        <MapProvider>
            <MapGL
                {...view}
                id="map"
                onMove={(e) => setView(e.viewState)}
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                maxBounds={props.scenario.boundaries as [number, number, number, number]}
                style={props.style}
                mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
                interactive={true}
                maxPitch={0}
                minPitch={0}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
                touchZoomRotate={true}
                attributionControl={false}
                fadeDuration={0}
                interactiveLayerIds={[LayersIds.positionFill, LayersIds.labelFill]}
                onLoad={onLoad}
                onRemove={onRemove}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}>
                <Layers flights={flights} selected={selectedFlight} pairs={props.selectedPairs} view={view} />
            </MapGL>
        </MapProvider>
    );
};

const onLoad = (e: MapEvent) => {
    if (window) window.addEventListener('resize', () => e.target.resize());
    e.target.touchZoomRotate.disableRotation();
};

const onRemove = (e: MapEvent) => {
    if (window) window.removeEventListener('resize', () => e.target.resize());
};

const onMouseEnter = (e: MapEvent) => {
    e.target.getCanvas().style.cursor = 'pointer';
};
const onMouseLeave = (e: MapEvent) => {
    e.target.getCanvas().style.cursor = '';
};

const Layers = (
    props: PropsWithChildren<{
        flights: Flight[];
        selected: string | null;
        pairs: [string, string][];
        view: View;
    }>
) => {
    const { map: mapRef } = useMap();

    const [collection, setCollection] = useState<FeatureCollection>({ type: 'FeatureCollection', features: [] });

    useEffect(() => {
        const map = mapRef?.getMap();

        if (!map) return;

        const project = ([lng, lat]: [number, number]) => {
            const point = map.project([lng, lat]);
            return [point.x, point.y] as [number, number];
        };

        const unproject = ([x, y]: [number, number]) => {
            const point = map.unproject([x, y]);
            return [point.lng, point.lat] as [number, number];
        };

        const scalingFactor = props.view.zoom ** 2;

        const bounds = map.getBounds();

        if (!bounds) return;

        const onViewFlights = props.flights.filter(
            (flight) =>
                props.pairs.map((pair) => pair[0]).includes(flight.id) ||
                props.pairs.map((pair) => pair[1]).includes(flight.id) ||
                (bounds.getWest() < flight.longitudeDeg &&
                    flight.longitudeDeg < bounds.getEast() &&
                    bounds.getSouth() < flight.latitudeDeg &&
                    flight.latitudeDeg < bounds.getNorth())
        );

        const computedCollection = featureCollection(
            onViewFlights,
            props.selected,
            props.pairs,
            scalingFactor,
            project,
            unproject,
            onViewFlights.length < 200
        );

        setCollection(computedCollection);
    }, [props.flights, mapRef, props.view.zoom, props.selected, props.pairs]);

    return (
        <Source id="scenario-source" type="geojson" data={collection}>
            <Layer
                id={LayersIds.leadVector}
                type="line"
                paint={{ 'line-color': '#FFFFFF' }}
                filter={['==', ['get', 'type'], GeometryTypes.speedVector]}
            />
            <Layer
                id={LayersIds.labelAnchor}
                type="line"
                paint={{ 'line-color': '#FFFFFF', 'line-opacity': 0.3 }}
                filter={['==', ['get', 'type'], GeometryTypes.labelLink]}
            />
            <Layer
                id={LayersIds.halo}
                type="line"
                paint={{ 'line-color': '#FFFFFF' }}
                filter={['==', ['get', 'type'], GeometryTypes.halo]}
            />
            <Layer
                id={LayersIds.positionFill}
                type="fill"
                paint={{ 'fill-color': '#FFFFFF' }}
                filter={['==', ['get', 'type'], GeometryTypes.position]}
            />
            <Layer
                id={LayersIds.positionBorder}
                type="line"
                paint={{ 'line-color': '#FFFFFF' }}
                filter={['==', ['get', 'type'], GeometryTypes.position]}
            />
            <Layer
                id={LayersIds.pcdLine}
                type="line"
                paint={{ 'line-color': '#D45D08', 'line-dasharray': [6, 4] }}
                filter={['==', ['get', 'type'], GeometryTypes.pcdLink]}
                beforeId={LayersIds.positionFill}
            />
            <Layer
                id={LayersIds.pcdLabelFill}
                type="fill"
                paint={{ 'fill-opacity': 0 }}
                filter={['==', ['get', 'type'], GeometryTypes.pcdLabel]}
            />
            <Layer
                id={LayersIds.pcdLabelText}
                type="symbol"
                filter={['==', ['get', 'type'], GeometryTypes.pcdText]}
                layout={{
                    'text-field': ['get', 'text'],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-justify': 'left',
                    'text-size': ['get', 'fontSize'],
                    'text-rotation-alignment': 'viewport'
                }}
                paint={{
                    'text-color': '#D45D08'
                }}
            />
            <Layer
                id={LayersIds.labelFill}
                type="fill"
                paint={{ 'fill-opacity': 0 }}
                filter={['==', ['get', 'type'], GeometryTypes.label]}
            />
            <Layer
                id={LayersIds.labelText}
                type="symbol"
                filter={['==', ['get', 'type'], GeometryTypes.labelText]}
                layout={{
                    // TODO: upload fonts to MapBox studio
                    // 'text-font': ['DIN Pro Regular', 'B612 Regular','B612', 'JetBrains Mono', 'JetBrains Mono Regular', 'DIN Pro Regular'],
                    'text-field': ['get', 'text'],
                    'text-allow-overlap': true,
                    'text-ignore-placement': true,
                    'text-justify': 'left',
                    'text-size': ['get', 'fontSize']
                }}
                paint={{ 'text-color': '#FFFFFF' }}
            />
        </Source>
    );
};

const GeometryTypes = {
    speedVector: 'speed',
    halo: 'halo',
    position: 'position',
    pcdLabel: 'pcd-label',
    pcdText: 'pcd-text',
    pcdLink: 'pcd-link',
    label: 'label',
    labelText: 'label-text',
    labelLink: 'label-link'
} as const;

const LayersIds = {
    positionFill: 'position-fill',
    positionBorder: 'position-border',
    leadVector: 'lead-vector',
    halo: 'halo',
    pcdLabelText: 'pcd-label-text',
    pcdLabelFill: 'pcd-label-fill',
    pcdLine: 'pcd-line',
    labelFill: 'labels-fill',
    labelText: 'labels-text',
    labelAnchor: 'label-anchor'
} as const;

export { ScenarioMap, GeometryTypes };
