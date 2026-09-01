import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  ImageBackground,
  ImageSourcePropType,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { BrandLogo } from './BrandLogo';
import { theme } from '../theme/theme';
import { styles } from './SignupRoleSelection.styles';

export type SignupRole = 'MUSICIAN' | 'VENUE' | 'PROMOTER';

interface RoleOption {
  type: SignupRole;
  label: 'ARTIST' | 'PROMOTER' | 'VENUE';
  accessibleLabel: string;
  hero: string;
  description: string;
  cta: string;
  accent: string;
  image: ImageSourcePropType;
  placeholderLabel: string;
}

// Brand topology: Promoter and Venue converge on the Artist in the center.
const ROLE_OPTIONS: RoleOption[] = [
  {
    type: 'PROMOTER',
    label: 'PROMOTER',
    accessibleLabel: 'Promoter',
    hero: 'MAKE THE\nSHOW HAPPEN.',
    description: 'Connect artists, venues, and opportunities across your network.',
    cta: 'ENTER AS PROMOTER',
    accent: theme.personas.promoter.accent,
    image: require('../../assets/matches/glass-houses.jpg'),
    placeholderLabel: 'TEMP / PROMOTER PHOTO',
  },
  {
    type: 'MUSICIAN',
    label: 'ARTIST',
    accessibleLabel: 'Artist or Band',
    hero: 'GET ON\nSTAGE.',
    description: 'Find venues, promoters, and collaborators who fit your sound.',
    cta: 'ENTER AS ARTIST',
    accent: theme.personas.artist.accentStart,
    image: require('../../assets/matches/glass-houses.jpg'),
    placeholderLabel: 'TEMP / ARTIST PHOTO',
  },
  {
    type: 'VENUE',
    label: 'VENUE',
    accessibleLabel: 'Venue',
    hero: 'FIND YOUR\nNEXT ACT.',
    description: 'Discover artists who fit your room, audience, and calendar.',
    cta: 'ENTER AS VENUE',
    accent: theme.personas.venue.accent,
    image: require('../../assets/matches/marlowe-room.jpg'),
    placeholderLabel: 'TEMP / VENUE PHOTO',
  },
];

interface SignupRoleSelectionProps {
  focusedRole: SignupRole;
  onFocusedRoleChange: (role: SignupRole) => void;
  onCommitRole: (role: SignupRole) => void;
  onSignIn: () => void;
}

interface RoleCardProps {
  option: RoleOption;
  index: number;
  focused: boolean;
  position: 'previous' | 'focused' | 'next';
  cardWidth: number;
  cardHeight: number;
  translateX: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  onCommitRole: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  option,
  index,
  focused,
  position,
  cardWidth,
  cardHeight,
  translateX,
  scale,
  opacity,
  onCommitRole,
}) => {
  const animatedPositionStyle = {
    width: cardWidth,
    height: cardHeight,
    opacity,
    transform: [{ translateX }, { scale }],
  };

  const card = (
    <View
      style={[
        styles.roleCard,
        {
          width: cardWidth,
          height: cardHeight,
          borderWidth: focused && option.type === 'MUSICIAN' ? 0 : 1,
          borderColor:
            focused && option.type === 'MUSICIAN'
              ? 'transparent'
              : focused
                ? option.accent
                : theme.colors.subtleBorder,
        },
      ]}
    >
      {focused && option.type === 'MUSICIAN' ? (
        <Svg
          pointerEvents="none"
          width={cardWidth}
          height={cardHeight}
          style={styles.artistBorder}
        >
          <Defs>
            <LinearGradient
              id="artistBorderGradient"
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={cardWidth}
              y2="0"
            >
              <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
              <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
            </LinearGradient>
          </Defs>
          <Rect
            x="1"
            y="1"
            width={cardWidth - 2}
            height={cardHeight - 2}
            rx="2"
            fill="none"
            stroke="url(#artistBorderGradient)"
            strokeWidth="1"
          />
        </Svg>
      ) : null}
      <ImageBackground
        source={option.image}
        resizeMode="cover"
        style={styles.roleImage}
        imageStyle={styles.roleImageCrop}
      >
        <View style={styles.roleImageShade} />
        {option.type === 'PROMOTER' ? (
          <View pointerEvents="none" style={styles.promoterTint} />
        ) : null}
        <View
          style={[
            styles.roleImageHeader,
            !focused && styles.inactiveRoleHeader,
            position === 'previous' && styles.inactiveRoleHeaderPrevious,
          ]}
        >
          <View style={focused && styles.focusedRoleIdentifier}>
            {focused && option.type === 'MUSICIAN' ? (
              <Svg
                pointerEvents="none"
                width={78}
                height={18}
              >
                <Defs>
                  <LinearGradient
                    id="artistIdentifierGradient"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="0"
                    x2="78"
                    y2="0"
                  >
                    <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
                    <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
                  </LinearGradient>
                </Defs>
                <SvgText
                  x="39"
                  y="13"
                  textAnchor="middle"
                  fill="url(#artistIdentifierGradient)"
                  fontFamily={theme.typography.fontFamily.bodyBold}
                  fontSize={theme.fontSizes.caption}
                  letterSpacing="1.6"
                >
                  {option.label}
                </SvgText>
              </Svg>
            ) : (
              <Text style={[styles.roleIdentifier, { color: option.accent }]}>
                {option.label}
              </Text>
            )}
          </View>
          {focused ? (
            <Text style={styles.placeholderLabel}>{option.placeholderLabel}</Text>
          ) : null}
        </View>
        <Text
          style={[
            styles.roleHero,
            !focused && styles.inactiveRoleHero,
            position === 'previous' && styles.inactiveRoleHeroPrevious,
          ]}
        >
          {option.hero}
        </Text>
      </ImageBackground>

      {focused ? (
        <>
          <View style={styles.roleDescriptionArea}>
            <Text style={styles.roleDescription}>{option.description}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.roleCta,
              option.type === 'MUSICIAN'
                ? styles.artistCta
                : { borderTopColor: option.accent },
            ]}
            onPress={onCommitRole}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel={`Continue as ${option.accessibleLabel}`}
            accessibilityState={{ selected: true }}
          >
            {option.type === 'MUSICIAN' ? (
              <Svg
                pointerEvents="none"
                width={cardWidth}
                height={62}
                style={styles.artistCtaArtwork}
              >
                <Defs>
                  <LinearGradient
                    id="artistCtaGradient"
                    gradientUnits="userSpaceOnUse"
                    x1="0"
                    y1="0"
                    x2={cardWidth}
                    y2="0"
                  >
                    <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
                    <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width={cardWidth}
                  height="1"
                  fill="url(#artistCtaGradient)"
                />
                <SvgText
                  x={theme.spacing.lg}
                  y="38"
                  fill="url(#artistCtaGradient)"
                  fontFamily={theme.typography.fontFamily.bodyBold}
                  fontSize={theme.fontSizes.bodySmall}
                  letterSpacing="1.2"
                >
                  {option.cta}
                </SvgText>
                <SvgText
                  x={cardWidth - theme.spacing.lg}
                  y="39"
                  textAnchor="end"
                  fill="url(#artistCtaGradient)"
                  fontFamily={theme.typography.fontFamily.bodyBold}
                  fontSize={theme.fontSizes.bodyLarge}
                >
                  →
                </SvgText>
              </Svg>
            ) : (
              <>
                <Text style={[styles.roleCtaText, { color: option.accent }]}>
                  {option.cta}
                </Text>
                <Text style={[styles.roleCtaArrow, { color: option.accent }]}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );

  if (focused) {
    return (
      <Animated.View
        collapsable={false}
        style={[styles.cardPosition, animatedPositionStyle, { zIndex: 3 }]}
        accessibilityLabel={`${option.accessibleLabel}. ${option.description} Selected. ${index + 1} of 3.`}
        accessibilityState={{ selected: true }}
      >
        {card}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.cardPosition, animatedPositionStyle, { zIndex: 1 }]}
    >
      {card}
    </Animated.View>
  );
};

export const SignupRoleSelection: React.FC<SignupRoleSelectionProps> = ({
  focusedRole,
  onFocusedRoleChange,
  onCommitRole,
  onSignIn,
}) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const isDesktop = width >= 1024;
  const carouselWidth = Math.min(width, 1080);
  const cardWidth = isMobile ? Math.min(width * 0.86, 380) : isDesktop ? 380 : 370;
  const cardHeight = isMobile ? 476 : 500;
  const sidePeek = isMobile ? Math.max(42, width * 0.12) : isDesktop ? 180 : 120;
  const sideTravel = carouselWidth / 2 - sidePeek + cardWidth * 0.4;
  const focusedIndex = Math.max(
    0,
    ROLE_OPTIONS.findIndex((option) => option.type === focusedRole),
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [focusedSideControl, setFocusedSideControl] = useState<'previous' | 'next' | null>(null);

  const positionFor = (index: number, activeIndex: number) => {
    if (index === activeIndex) return 0;
    const previousIndex = (activeIndex - 1 + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;
    return index === previousIndex ? -sideTravel : sideTravel;
  };

  const animations = useRef(
    ROLE_OPTIONS.map((_, index) => ({
      translateX: new Animated.Value(positionFor(index, focusedIndex)),
      scale: new Animated.Value(index === focusedIndex ? 1 : 0.8),
      opacity: new Animated.Value(index === focusedIndex ? 1 : 0.48),
    })),
  ).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const duration = reduceMotion ? 0 : 300;
    Animated.parallel(
      animations.flatMap((animation, index) => [
        Animated.timing(animation.translateX, {
          toValue: positionFor(index, focusedIndex),
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(animation.scale, {
          toValue: index === focusedIndex ? 1 : 0.8,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(animation.opacity, {
          toValue: index === focusedIndex ? 1 : 0.48,
          duration,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [animations, focusedIndex, reduceMotion, sideTravel]);

  const focusIndex = (nextIndex: number, announce = true) => {
    const wrappedIndex = (nextIndex + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;
    const nextRole = ROLE_OPTIONS[wrappedIndex];
    onFocusedRoleChange(nextRole.type);
    if (announce) {
      AccessibilityInfo.announceForAccessibility(
        `${nextRole.accessibleLabel} role selected, ${wrappedIndex + 1} of 3.`,
      );
    }
  };

  const focusPrevious = () => focusIndex(focusedIndex - 1);
  const focusNext = () => focusIndex(focusedIndex + 1);
  const previousIndex = (focusedIndex - 1 + ROLE_OPTIONS.length) % ROLE_OPTIONS.length;
  const nextIndex = (focusedIndex + 1) % ROLE_OPTIONS.length;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx <= -42) focusNext();
          if (gesture.dx >= 42) focusPrevious();
        },
        onPanResponderTerminate: () => undefined,
      }),
    [focusedIndex],
  );

  const carouselKeyboardProps = Platform.OS === 'web'
    ? ({
        tabIndex: 0,
        onKeyDown: (event: any) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            focusPrevious();
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            focusNext();
          }
        },
      } as any)
    : {};

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageFrame}>
          <View style={[styles.logoRow, isMobile && styles.logoRowMobile]}>
            <BrandLogo
              width={isMobile ? 152 : 184}
              height={isMobile ? 32 : 39}
            />
          </View>

          <View style={[styles.header, isDesktop && styles.headerDesktop]}>
            <Text style={styles.eyebrow}>CHOOSE YOUR ROLE</Text>
            <Text style={[styles.title, isMobile && styles.titleMobile]}>
              WHERE DO YOU{isDesktop ? '\n' : ' '}ENTER THE SCENE?
            </Text>
            <Text style={styles.subtitle}>Choose your place in live music.</Text>
          </View>

          <View style={styles.carouselRegion}>
            <View style={styles.carouselControlRow}>
              <TouchableOpacity
                style={styles.carouselControl}
                onPress={focusPrevious}
                accessibilityRole="button"
                accessibilityLabel={`View ${ROLE_OPTIONS[previousIndex].accessibleLabel} role`}
              >
                <Text style={styles.carouselControlArrow}>←</Text>
                <Text style={styles.carouselControlText}>
                  {ROLE_OPTIONS[previousIndex].label}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.carouselControl, styles.carouselControlNext]}
                onPress={focusNext}
                accessibilityRole="button"
                accessibilityLabel={`View ${ROLE_OPTIONS[nextIndex].accessibleLabel} role`}
              >
                <Text style={styles.carouselControlText}>
                  {ROLE_OPTIONS[nextIndex].label}
                </Text>
                <Text
                  style={[styles.carouselControlArrow, styles.carouselControlArrowNext]}
                >
                  →
                </Text>
              </TouchableOpacity>
            </View>

            <View
              {...panResponder.panHandlers}
              {...carouselKeyboardProps}
              style={[styles.carouselViewport, { width: carouselWidth, height: cardHeight }]}
              accessible={Platform.OS === 'web'}
              accessibilityRole="adjustable"
              accessibilityLabel={`Role carousel. ${ROLE_OPTIONS[focusedIndex].accessibleLabel} selected, ${focusedIndex + 1} of 3.`}
              accessibilityActions={[{ name: 'decrement' }, { name: 'increment' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'decrement') focusPrevious();
                if (event.nativeEvent.actionName === 'increment') focusNext();
              }}
            >
              {ROLE_OPTIONS.map((option, index) => (
                <RoleCard
                  key={option.type}
                  option={option}
                  index={index}
                  focused={index === focusedIndex}
                  position={
                    index === focusedIndex
                      ? 'focused'
                      : index === (focusedIndex - 1 + ROLE_OPTIONS.length) % ROLE_OPTIONS.length
                        ? 'previous'
                        : 'next'
                  }
                  cardWidth={cardWidth}
                  cardHeight={cardHeight}
                  translateX={animations[index].translateX}
                  scale={animations[index].scale}
                  opacity={animations[index].opacity}
                  onCommitRole={() => onCommitRole(option.type)}
                />
              ))}
              <Pressable
                style={[
                  styles.sideCardHitTarget,
                  styles.sideCardHitTargetPrevious,
                  { width: sidePeek },
                  focusedSideControl === 'previous' && {
                    borderColor: ROLE_OPTIONS[previousIndex].accent,
                    borderWidth: 1,
                  },
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                ]}
                onPress={focusPrevious}
                onFocus={() => setFocusedSideControl('previous')}
                onBlur={() => setFocusedSideControl(null)}
                accessibilityRole="button"
                accessibilityLabel={`View ${ROLE_OPTIONS[previousIndex].accessibleLabel} role. ${previousIndex + 1} of 3.`}
                accessibilityState={{ selected: false }}
              />
              <Pressable
                style={[
                  styles.sideCardHitTarget,
                  styles.sideCardHitTargetNext,
                  { width: sidePeek },
                  focusedSideControl === 'next' && {
                    borderColor: ROLE_OPTIONS[nextIndex].accent,
                    borderWidth: 1,
                  },
                  Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
                ]}
                onPress={focusNext}
                onFocus={() => setFocusedSideControl('next')}
                onBlur={() => setFocusedSideControl(null)}
                accessibilityRole="button"
                accessibilityLabel={`View ${ROLE_OPTIONS[nextIndex].accessibleLabel} role. ${nextIndex + 1} of 3.`}
                accessibilityState={{ selected: false }}
              />
            </View>
          </View>

          <View style={styles.networkIndicator} accessibilityLabel="Role selector">
            {ROLE_OPTIONS.map((option, index) => {
              const active = index === focusedIndex;
              return (
                <React.Fragment key={option.type}>
                  {index > 0 ? <View style={styles.networkLine} /> : null}
                  <TouchableOpacity
                    style={styles.nodeHitTarget}
                    onPress={() => focusIndex(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${option.accessibleLabel} role`}
                    accessibilityState={{ selected: active }}
                  >
                    {option.type === 'MUSICIAN' && active ? (
                      <Svg width={12} height={12} pointerEvents="none">
                        <Defs>
                          <LinearGradient
                            id="artistNodeGradient"
                            gradientUnits="userSpaceOnUse"
                            x1="0"
                            y1="0"
                            x2="12"
                            y2="0"
                          >
                            <Stop offset="0%" stopColor={theme.personas.artist.accentStart} />
                            <Stop offset="100%" stopColor={theme.personas.artist.accentEnd} />
                          </LinearGradient>
                        </Defs>
                        <Circle cx="6" cy="6" r="6" fill="url(#artistNodeGradient)" />
                      </Svg>
                    ) : (
                      <View
                        style={[
                          styles.networkNode,
                          active && {
                            borderColor: option.accent,
                            backgroundColor: option.accent,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>

          <Text style={styles.gestureCue}>
            {isMobile ? '← SWIPE →' : '← DRAG / CLICK →'}
          </Text>

          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>ALREADY A MEMBER?</Text>
            <TouchableOpacity
              style={styles.signInHitTarget}
              onPress={onSignIn}
              accessibilityRole="button"
              accessibilityLabel="Sign in to MVPConnect"
            >
              <Text style={styles.loginLink}>SIGN IN →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
