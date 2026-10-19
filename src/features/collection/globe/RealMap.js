import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import PhotoPin from './PhotoPin';

/**
 * The close-up half of the Book's globe: the system map (Apple Maps on iOS),
 * with a photo pin for each cluster of words snapped there.
 *
 * It only shows the map and reports back - where it has been moved to, which
 * pin was tapped. Clustering, and deciding when to hand back to the drawn
 * globe, are GlobeView's.
 */
const RealMap = forwardRef(function RealMap(
  { initialRegion, mapType, clusters, onRegionChangeComplete, onPickCluster, onPressMap },
  ref
) {
  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      mapType={mapType}
      // Kept north-up and flat, like the globe it takes over from.
      rotateEnabled={false}
      pitchEnabled={false}
      showsCompass={false}
      showsScale={false}
      showsUserLocation={false}
      toolbarEnabled={false}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={(event) => {
        // A tap on a pin reaches the map too; only a tap on the map itself
        // should close the sheet.
        if (event.nativeEvent.action !== 'marker-press') onPressMap();
      }}
    >
      {clusters.map((cluster) => (
        <Marker
          key={cluster.id}
          coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onPickCluster(cluster)}
        >
          {/* Room for the count badge, which hangs over the corner. */}
          <View style={styles.marker}>
            <PhotoPin items={cluster.items} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
});

export default RealMap;

const styles = StyleSheet.create({
  marker: {
    padding: 9,
  },
});
