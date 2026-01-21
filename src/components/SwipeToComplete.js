import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Animated,
    Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 64;
const THUMB_SIZE = 60;
const TRACK_HEIGHT = 70;

const SwipeToComplete = ({ onComplete, disabled }) => {
    const pan = useRef(new Animated.Value(0)).current;
    const maxSlide = SLIDER_WIDTH - THUMB_SIZE;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !disabled,
            onMoveShouldSetPanResponder: () => !disabled,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dx >= 0 && gestureState.dx <= maxSlide) {
                    pan.setValue(gestureState.dx);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dx >= maxSlide * 0.8) {
                    // Completed
                    Animated.spring(pan, {
                        toValue: maxSlide,
                        useNativeDriver: false,
                    }).start(() => {
                        onComplete();
                        // Reset after completion
                        setTimeout(() => {
                            Animated.spring(pan, {
                                toValue: 0,
                                useNativeDriver: false,
                            }).start();
                        }, 500);
                    });
                } else {
                    // Reset
                    Animated.spring(pan, {
                        toValue: 0,
                        useNativeDriver: false,
                    }).start();
                }
            },
        })
    ).current;

    const thumbOpacity = pan.interpolate({
        inputRange: [0, maxSlide],
        outputRange: [1, 0],
    });

    const textOpacity = pan.interpolate({
        inputRange: [0, maxSlide * 0.5],
        outputRange: [1, 0],
    });

    return (
        <View style={styles.container}>
            <View style={[styles.track, disabled && styles.trackDisabled]}>
                <Animated.Text style={[styles.text, { opacity: textOpacity }]}>
                    {disabled ? 'Processing...' : 'Swipe to Complete Delivery →'}
                </Animated.Text>
                <Animated.View
                    style={[
                        styles.thumb,
                        {
                            transform: [{ translateX: pan }],
                            opacity: thumbOpacity,
                        },
                        disabled && styles.thumbDisabled,
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Text style={styles.thumbIcon}>→</Text>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    track: {
        width: SLIDER_WIDTH,
        height: TRACK_HEIGHT,
        backgroundColor: '#4CAF50',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        elevation: 4,
    },
    trackDisabled: {
        backgroundColor: '#ccc',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        position: 'absolute',
    },
    thumb: {
        position: 'absolute',
        left: 5,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        backgroundColor: '#fff',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
    },
    thumbDisabled: {
        backgroundColor: '#999',
    },
    thumbIcon: {
        fontSize: 28,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
});

export default SwipeToComplete;
