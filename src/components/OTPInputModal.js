import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';

const OTPInputModal = ({ visible, onSubmit, onCancel, loading, title, message }) => {
    const [otp, setOtp] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (visible) {
            // Auto focus the hidden input when modal opens
            setTimeout(() => {
                inputRef.current?.focus();
            }, 500);
        } else {
            setOtp('');
        }
    }, [visible]);

    const handleSubmit = () => {
        if (otp.length !== 4) return;
        onSubmit(otp);
    };

    const handleCancel = () => {
        setOtp('');
        onCancel();
    };

    const handleOtpChange = (value) => {
        // Only allow numbers and limit to 4 digits
        const numericValue = value.replace(/[^0-9]/g, '');
        if (numericValue.length <= 4) {
            setOtp(numericValue);
        }
    };

    const renderOtpBoxes = () => {
        return (
            <TouchableOpacity
                style={styles.otpOuterContainer}
                onPress={() => inputRef.current?.focus()}
                activeOpacity={1}
            >
                {[0, 1, 2, 3].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.otpBox,
                            otp.length === index && styles.otpBoxActive,
                            otp.length > index && styles.otpBoxFilled
                        ]}
                    >
                        <Text style={styles.otpText}>
                            {otp[index] || ''}
                        </Text>
                    </View>
                ))}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={handleCancel}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={handleCancel}>
                    <View style={styles.absoluteOverlay} />
                </TouchableWithoutFeedback>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.keyboardView}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.headerIndicator} />

                        <Text style={styles.title}>{title || 'Enter OTP'}</Text>
                        <Text style={styles.subtitle}>
                            {message || 'Enter the 4-digit code'}
                        </Text>

                        {/* Hidden TextInput to trigger native keyboard */}
                        <TextInput
                            ref={inputRef}
                            style={styles.hiddenInput}
                            keyboardType="number-pad"
                            maxLength={4}
                            value={otp}
                            onChangeText={handleOtpChange}
                            caretHidden={true}
                        />

                        <View style={styles.contentContainer}>
                            {renderOtpBoxes()}
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={handleCancel}
                                disabled={loading}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.button,
                                    styles.submitButton,
                                    otp.length !== 4 && styles.disabledButton,
                                ]}
                                onPress={handleSubmit}
                                disabled={otp.length !== 4 || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Verify</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    absoluteOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        width: '100%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    headerIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#ddd',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1A1A1A',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    hiddenInput: {
        position: 'absolute',
        width: 0,
        height: 0,
        opacity: 0,
    },
    contentContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    otpOuterContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
    },
    otpBox: {
        width: 65,
        height: 75,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    otpBoxActive: {
        borderColor: '#4CAF50',
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    otpBoxFilled: {
        borderColor: '#4CAF50',
        backgroundColor: '#F1F8F1',
    },
    otpText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 15,
    },
    button: {
        flex: 1,
        height: 55,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F5F5F5',
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        elevation: 4,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    disabledButton: {
        backgroundColor: '#BDBDBD',
        elevation: 0,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default OTPInputModal;
