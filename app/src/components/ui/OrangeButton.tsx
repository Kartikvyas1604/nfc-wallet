import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Animated,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Radius, Shadows } from '../../theme/colors';
import { FontFamily, FontSize } from '../../theme/typography';

type ButtonSize    = 'sm' | 'md' | 'lg';
type ButtonVariant = 'solid' | 'outline' | 'ghost';

interface OrangeButtonProps {
  label:      string;
  onPress:    () => void;
  loading?:   boolean;
  disabled?:  boolean;
  size?:      ButtonSize;
  variant?:   ButtonVariant;
  style?:     ViewStyle;
  fullWidth?: boolean;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; fontSize: number; px: number }> = {
  sm:  { height: 40, fontSize: FontSize.sm,   px: 16 },
  md:  { height: 50, fontSize: FontSize.base,  px: 22 },
  lg:  { height: 56, fontSize: FontSize.md,    px: 28 },
};

export default function OrangeButton({
  label,
  onPress,
  loading   = false,
  disabled  = false,
  size      = 'lg',
  variant   = 'solid',
  style,
  fullWidth = false,
}: OrangeButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.96,
      duration: 90,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 4,
    }).start();
  };

  const { height, fontSize, px } = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;

  // Build container styles
  const containerStyles: ViewStyle[] = [
    styles.base,
    { height, borderRadius: Radius.full, paddingHorizontal: px },
    variant === 'solid'   ? styles.solid   : styles.transparent,
    variant === 'outline' ? styles.outline  : {},
    variant === 'solid' && !isDisabled ? (Shadows.orangeGlow as ViewStyle) : {},
    fullWidth ? styles.fullWidth : {},
    isDisabled ? styles.disabled : {},
    style ?? {},
  ];

  // Build label styles
  const labelStyles: TextStyle[] = [
    styles.labelBase,
    { fontSize },
    variant === 'solid'   ? styles.labelSolid   : {},
    variant === 'outline' ? styles.labelOutline  : {},
    variant === 'ghost'   ? styles.labelGhost    : {},
  ];

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View
        style={[
          containerStyles,
          { transform: [{ scale: scaleAnim }], opacity: isDisabled ? 0.4 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'solid' ? Colors.offWhite : Colors.brandOrange}
            size="small"
          />
        ) : (
          <View style={styles.row}>
            <Text allowFontScaling={false} style={labelStyles}>
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  solid: {
    backgroundColor: Colors.brandOrange,
  },
  transparent: {
    backgroundColor: Colors.transparent,
  },
  outline: {
    borderWidth: 1.5,
    borderColor: Colors.brandOrange,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelBase: {
    fontFamily: FontFamily.interSemiBold,
    letterSpacing: 0.2,
  },
  labelSolid: {
    color: Colors.offWhite,
  },
  labelOutline: {
    color: Colors.brandOrange,
  },
  labelGhost: {
    color: Colors.brandOrange,
  },
});
