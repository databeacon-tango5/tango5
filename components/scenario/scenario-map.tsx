'use client';

import { useState, useEffect, type PropsWithChildren, CSSProperties, useMemo } from 'react';
import MapGL, { MapProvider, Layer, Source, useMap } from 'react-map-gl';
import type { FeatureCollection } from 'geojson';
import { Flight } from '~/lib/domain/flight';
import { featureCollection as featureCollection } from '~/lib/domain/geojson';
import { Scenario } from '~/lib/domain/scenario';
import { MapEvent, MapMouseEvent } from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

type ScenarioMapProps = {
    style?: CSSProperties;
    scenario: Scenario;
    selectFlight: (id: string) => void;
    selectedFlight: string | null;
    selectedPairs: [string, string][];
    isGameOver: boolean;
};

const ScenarioMap = (props: PropsWithChildren<ScenarioMapProps>) => {
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
        if (id) props.selectFlight(id);
    };

    return (
        <MapProvider>
            <MapGL
                id="map"
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                initialViewState={{ bounds: props.scenario.boundaries as [number, number, number, number] }}
                style={props.style}
                mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
                interactive={false}
                fadeDuration={0}
                interactiveLayerIds={[LayersIds.positionFill, LayersIds.labelFill]}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}>
                <Layers
                    flights={flights}
                    solutionPairs={props.scenario.pcds.map((pcd) => [pcd.firstId, pcd.secondId])}
                    selectedFlight={props.selectedFlight}
                    selectedPairs={props.selectedPairs}
                    isGameOver={props.isGameOver}
                />
            </MapGL>
        </MapProvider>
    );
};

const onMouseEnter = (e: MapEvent) => {
    e.target.getCanvas().style.cursor = 'pointer';
};
const onMouseLeave = (e: MapEvent) => {
    e.target.getCanvas().style.cursor = '';
};

type LayerProps = {
    flights: Flight[];
    solutionPairs: [string, string][];
    selectedFlight: string | null;
    selectedPairs: [string, string][];
    isGameOver: boolean;
};

const colors = {
    correct: '#779556',
    fail: '#D45D08'
};

const Layers = (props: PropsWithChildren<LayerProps>) => {
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

        const zoom = map.getZoom();

        const scalingFactor = zoom ** 2;

        const bounds = map.getBounds();

        if (!bounds) return;

        const onViewFlights = props.flights.filter(
            (flight) =>
                props.selectedPairs.map((pair) => pair[0]).includes(flight.id) ||
                props.selectedPairs.map((pair) => pair[1]).includes(flight.id) ||
                (bounds.getWest() < flight.longitudeDeg &&
                    flight.longitudeDeg < bounds.getEast() &&
                    bounds.getSouth() < flight.latitudeDeg &&
                    flight.latitudeDeg < bounds.getNorth())
        );

        const computedCollection = featureCollection(
            onViewFlights,
            props.selectedFlight,
            props.selectedPairs,
            props.solutionPairs,
            props.isGameOver,
            scalingFactor,
            project,
            unproject
        );

        setCollection(computedCollection);
    }, [props.flights, mapRef, props.selectedFlight, props.selectedPairs, props.solutionPairs, props.isGameOver]);

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
                paint={{ 'line-color': ['case', ['boolean', ['get', 'correct'], true], colors.correct, colors.fail] }}
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
                paint={{ 'line-color': ['case', ['boolean', ['get', 'correct'], true], colors.correct, colors.fail] }}
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
                paint={{ 'text-color': ['case', ['boolean', ['get', 'correct'], true], colors.correct, colors.fail] }}
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
