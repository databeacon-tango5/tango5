'use client';

import { useState, useEffect, type PropsWithChildren, CSSProperties, useMemo, PropsWithoutRef } from 'react';
import MapGL, { MapProvider, Layer, Source, useMap } from 'react-map-gl';
import type { FeatureCollection } from 'geojson';
import { Flight } from '~/lib/domain/flight';
import { featureCollection as featureCollection } from '~/lib/domain/geojson';
import { Scenario } from '~/lib/domain/scenario';
import { MapEvent, MapMouseEvent } from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';
import { point, rhumbDestination, Units } from '@turf/turf';

type ScenarioMapProps = {
    style?: CSSProperties;
    scenario: Scenario;
    selectFlight: (id: string) => void;
    selectedFlight: string | null;
    selectedPairs: [string, string][];
    isGameOver: boolean;
};

const ScenarioMap = (props: PropsWithChildren<ScenarioMapProps>) => {
    const [zoom, setZoom] = useState<number | undefined>(undefined);

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

    const onMouseEnter = (e: MapEvent) => {
        e.target.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = (e: MapEvent) => {
        e.target.getCanvas().style.cursor = '';
    };

    return (
        <MapProvider>
            <ScaleMap latitude={props.scenario.boundaries[3]} />
            <MapGL
                id="map"
                mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                initialViewState={{ bounds: props.scenario.boundaries as [number, number, number, number] }}
                style={props.style}
                mapStyle={process.env.NEXT_PUBLIC_MAPBOX_STYLE}
                interactive={false}
                fadeDuration={0}
                interactiveLayerIds={[LayersIds.positionFill, LayersIds.labelFill]}
                onLoad={(e) => setZoom(e.target.getZoom())}
                onZoomEnd={(e) => setZoom(e.viewState.zoom)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}>
                <ResizeEffects bounds={props.scenario.boundaries} />
                <Layers
                    zoom={zoom}
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

const ScaleMap = (props: PropsWithoutRef<{ latitude: number }>) => {
    const { map: mapRef } = useMap();
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const map = mapRef?.getMap();
        if (!map) return;

        const coords1 = [0, props.latitude] as [number, number];
        const point1 = point(coords1);
        const distance = 5;
        const bearing = 90;
        const options: {
            units?: Units;
        } = { units: 'nauticalmiles' };

        const point2 = rhumbDestination(point1, distance, bearing, options);

        const proj1 = map.project(coords1);
        const proj2 = map.project([point2.geometry.coordinates[0], point2.geometry.coordinates[1]]);

        const distanceInPixels = Math.round(Math.abs(proj1.x - proj2.x));

        setWidth(distanceInPixels);
    }, [props.latitude, mapRef]);

    if (!mapRef) return;

    return (
        <div className={`fixed bottom-8 left-8 z-30`} style={{ width: `${width}px` }}>
            <div className="text-center">5NM</div>
            <div className="h-[5px] w-full border-b-[1px] border-l-[1px] border-r-[1px] border-primary"></div>
            <div className="h-1 w-full border-l-[1px] border-r-[1px] border-primary"></div>
        </div>
    );
};

const ResizeEffects = (props: PropsWithoutRef<{ bounds: number[] }>) => {
    const { map: mapRef } = useMap();

    useEffect(() => {
        const map = mapRef?.getMap();

        if (map) {
            const fitBounds = () => map.fitBounds(props.bounds as [number, number, number, number]);
            const resize = () => map.resize.bind(map);

            window.addEventListener('resize', fitBounds);
            window.addEventListener('resize', resize);

            return () => {
                window.removeEventListener('resize', fitBounds);
                window.removeEventListener('resize', resize);
            };
        }
    }, [mapRef, props.bounds]);

    return null;
};

type LayerProps = {
    zoom?: number;
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

        if (!map || !props.zoom) return;

        const project = ([lng, lat]: [number, number]) => {
            const point = map.project([lng, lat]);
            return [point.x, point.y] as [number, number];
        };

        const unproject = ([x, y]: [number, number]) => {
            const point = map.unproject([x, y]);
            return [point.lng, point.lat] as [number, number];
        };

        const scalingFactor = props.zoom ** 2;

        const computedCollection = featureCollection(
            props.flights,
            props.selectedFlight,
            props.selectedPairs,
            props.solutionPairs,
            props.isGameOver,
            scalingFactor,
            project,
            unproject
        );

        setCollection(computedCollection);
    }, [
        props.flights,
        props.zoom,
        mapRef,
        props.selectedFlight,
        props.selectedPairs,
        props.solutionPairs,
        props.isGameOver
    ]);

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
