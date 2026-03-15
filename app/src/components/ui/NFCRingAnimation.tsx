import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { Colors } from '../../theme/colors';

type NFCState = 'idle' | 'scanning' | 'success' | 'error';

interface NFCRingAnimationProps {
  state: NFCState;
  size?: number;
}

const BASE  = 200;
const RADII = [32, 52, 72];

export default function NFCRingAnimation({ state, size = BASE }: NFCRingAnimationProps) {
  const ring0 = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const rings  = [ring0, ring1, ring2];

  const iconScale = useRef(new Animated.Value(1)).current;
  const shakeX    = useRef(new Animated.Value(0)).current;

  const stopAll = () => { rings.forEach(r => r.stopAnimation()); };

  const resetRings = () => {
    rings.forEach(r => {
      r.stopAnimation();
      r.setValue(0);
    });
  };

  const runScan = () => {
    resetRings();
    // Staggered infinite loop — each ring starts 350ms after previous
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      );

    makeLoop(ring0, 0).start();
    makeLoop(ring1, 380).start();
    makeLoop(ring2, 760).start();
  };

  const runSuccess = () => {
    stopAll();
    rings.forEach(r => r.setValue(0));
    // Burst all rings simultaneously
    Animated.parallel(
      rings.map(r =>
        Animated.timing(r, { toValue: 1, duration: 500, useNativeDriver: true })
      )
    ).start();
    // Icon pulse
    Animated.sequence([
      Animated.spring(iconScale, { toValue: 1.25, useNativeDriver: true, speed: 40, bounciness: 8 }),
      Animated.spring(iconScale, { toValue: 1,    useNativeDriver: true, speed: 20 }),
    ]).start();
  };

  const runError = () => {
    stopAll();
    rings.forEach(r => r.setValue(0));
    rings.forEach(r =>
      Animated.timing(r, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    );
    // Shake icon
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:  -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue:   0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    switch (state) {
      case 'idle':
        resetRings();
        iconScale.setValue(1);
        break;
      case 'scanning':
        runScan();
        break;
      case 'success':
        runSuccess();
        break;
      case 'error':
        runError();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const ringColor =
    state === 'success' ? Colors.success :
    state === 'error'   ? Colors.error   :
    Colors.brandOrange;

  const scale = size / BASE;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Animated expanding rings */}
      {rings.map((anim, i) => {
        const r = RADII[i];
        return (
          <Animated.View
            key={i}
            style={[
              styles.ring,
              {
                width:        r * 2,
                height:       r * 2,
                borderRadius: r,
                borderColor:  ringColor,
                opacity: anim.interpolate({
                  inputRange:  [0, 0.25, 1],
                  outputRange: [0, 0.55, 0],
                }),
                transform: [{
                  scale: anim.interpolate({
                    inputRange:  [0, 1],
                    outputRange: [0.6, 2.1],
                  }),
                }],
              },
            ]}
          />
        );
      })}

      {/* Center icon */}
      <Animated.View
        style={[
          styles.center,
          {
            transform: [
              { scale: iconScale },
              { translateX: shakeX },
            ],
          },
        ]}
      >
        {state === 'success' ? (
          /* Animated checkmark */
          <Svg width={56 * scale} height={56 * scale} viewBox="0 0 56 56">
            <Circle
              cx="28" cy="28" r="25"
              stroke={Colors.success}
              strokeWidth="2"
              fill="none"
            />
            <Polyline
              points="17,28 24,35 39,20"
              stroke={Colors.success}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        ) : state === 'error' ? (
          /* Red X */
          <Svg width={56 * scale} height={56 * scale} viewBox="0 0 56 56">
            <Circle
              cx="28" cy="28" r="25"
              stroke={Colors.error}
              strokeWidth="2"
              fill="rgba(255,71,87,0.12)"
            />
            <Path
              d="M18 18 L38 38 M38 18 L18 38"
              stroke={Colors.error}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </Svg>
        ) : (
          /* NFC icon — SVG arcs + dot */
          <Svg width={48 * scale} height={48 * scale} viewBox="0 0 48 48">
            {/* Background circle */}
            <Circle
              cx="24" cy="24" r="22"
              fill="rgba(253,112,20,0.10)"
            />
            {/* Inner arcs */}
            <Path
              d="M18 30 C18 30 15 27 15 24 C15 19.03 19.03 15 24 15"
              stroke={ringColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M30 30 C30 30 33 27 33 24 C33 19.03 28.97 15 24 15"
              stroke={ringColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M13 34 C13 34 9 30 9 24 C9 15.16 15.16 9 24 9"
              stroke={ringColor}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            <Path
              d="M35 34 C35 34 39 30 39 24 C39 15.16 32.84 9 24 9"
              stroke={ringColor}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.4"
            />
            {/* Center vertical bar */}
            <Path
              d="M24 32 L24 17"
              stroke={Colors.offWhite}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Center dot */}
            <Circle cx="24" cy="24" r="2.5" fill={ringColor} />
          </Svg>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
