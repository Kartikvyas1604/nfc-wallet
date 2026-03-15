import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Colors, Shadows } from '../../theme/colors';

interface PinDotProps {
  count:  number;  // total dots: 4–6
  filled: number;  // how many are currently filled
}

export default function PinDot({ count, filled }: PinDotProps) {
  const scales = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const shouldFill = i < filled;
      if (shouldFill) {
        Animated.spring(scales[i], {
          toValue: 1,
          useNativeDriver: true,
          speed: 60,
          bounciness: 14,
        }).start();
      } else {
        Animated.timing(scales[i], {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled, count]);

  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.outer}>
          {/* Empty ring */}
          <View style={styles.emptyDot} />
          {/* Filled center — spring in */}
          <Animated.View
            style={[
              styles.fillDot,
              i < filled ? styles.filled : {},
              i < filled ? Shadows.orangeGlow as object : {},
              { transform: [{ scale: scales[i] }] },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outer: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(238,238,238,0.12)',
    position: 'absolute',
  },
  fillDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
  },
  filled: {
    backgroundColor: Colors.brandOrange,
  },
});
