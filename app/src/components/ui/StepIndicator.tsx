import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';

interface StepIndicatorProps {
  steps:       string[];
  currentStep: number;   // 0-based
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const lineAnims = useRef(
    steps.slice(0, -1).map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    lineAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i < currentStep ? 1 : 0,
        duration: 400,
        useNativeDriver: false,
      }).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  return (
    <View style={styles.wrapper}>
      {steps.map((label, i) => {
        const isComplete = i <  currentStep;
        const isActive   = i === currentStep;

        return (
          <React.Fragment key={i}>
            {/* Step node */}
            <View style={styles.node}>
              <View
                style={[
                  styles.circle,
                  isActive   && styles.circleActive,
                  isComplete && styles.circleComplete,
                  !isActive && !isComplete && styles.circleInactive,
                ]}
              >
                {isComplete ? (
                  <Feather name="check" size={11} color={Colors.offWhite} />
                ) : (
                  <Text
                    allowFontScaling={false}
                    style={[
                      styles.stepNum,
                      (isActive || isComplete) ? styles.stepNumActive : styles.stepNumInactive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                allowFontScaling={false}
                style={[
                  styles.label,
                  isActive   && styles.labelActive,
                  isComplete && styles.labelComplete,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>

            {/* Connector (skip after last step) */}
            {i < steps.length - 1 && (
              <View style={styles.lineTrack}>
                <Animated.View
                  style={[
                    styles.lineFill,
                    {
                      width: lineAnims[i].interpolate({
                        inputRange:  [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
  },
  node: {
    alignItems: 'center',
    gap: 6,
    minWidth: 52,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: Colors.brandOrange,
  },
  circleComplete: {
    backgroundColor: Colors.brandOrange,
  },
  circleInactive: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.textFaint,
  },
  stepNum: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.xs,
  },
  stepNumActive: {
    color: Colors.offWhite,
  },
  stepNumInactive: {
    color: Colors.textMuted,
  },
  label: {
    fontFamily: FontFamily.inter,
    fontSize: FontSize.xs,
    color: Colors.textFaint,
    textAlign: 'center',
  },
  labelActive: {
    color: Colors.brandOrange,
    fontFamily: FontFamily.interMedium,
  },
  labelComplete: {
    color: Colors.textMuted,
  },
  lineTrack: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.textFaint,
    marginTop: 13,
    overflow: 'hidden',
    borderRadius: 1,
  },
  lineFill: {
    height: '100%',
    backgroundColor: Colors.brandOrange,
  },
});
