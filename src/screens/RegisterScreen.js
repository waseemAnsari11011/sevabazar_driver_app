import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { registerDriver } from '../api/auth';

const RegisterScreen = ({ navigation }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        password: '',
        plateNumber: '',
        type: 'bike',
    });
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(false);

    const selectDocument = () => {
        try {
            if (typeof launchImageLibrary !== 'function') {
                Alert.alert('Error', 'Image Picker module not found. Please rebuild the app.');
                return;
            }
            launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
                if (response.didCancel) return;
                if (response.errorCode) {
                    Alert.alert('Error', response.errorMessage || 'Unknown error');
                } else if (response.assets && response.assets.length > 0) {
                    setDocument(response.assets[0]);
                }
            });
        } catch (error) {
            console.error('Select Document Error:', error);
            Alert.alert('Error', 'Failed to open gallery: ' + error.message);
        }
    };

    const handleRegister = async () => {
        const { name, phone, password, plateNumber, type } = formData;
        if (!name || !phone || !password || !plateNumber) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }

        if (!document) {
            Alert.alert('Error', 'Please upload your License or ID document');
            return;
        }

        const data = new FormData();
        data.append('personalDetails', JSON.stringify({ name, phone, password }));
        data.append('vehicleDetails', JSON.stringify({ plateNumber, type }));

        data.append('documents', {
            uri: Platform.OS === 'ios' ? document.uri.replace('file://', '') : document.uri,
            type: document.type || 'image/jpeg',
            name: document.fileName || `document_${Date.now()}.jpg`,
        });

        setLoading(true);
        try {
            await registerDriver(data);
            Alert.alert(
                'Success',
                'Registration successful! Please wait for admin approval before logging in.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (error) {
            console.error('Registration Error:', error);
            Alert.alert('Registration Failed', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.inner}>
                    <Text style={styles.title}>Join SevaBazar</Text>
                    <Text style={styles.subtitle}>Create your driver account</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Full Name"
                        value={formData.name}
                        onChangeText={(text) => setFormData({ ...formData, name: text })}
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Phone Number"
                        keyboardType="phone-pad"
                        value={formData.phone}
                        onChangeText={(text) => setFormData({ ...formData, phone: text })}
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        secureTextEntry
                        value={formData.password}
                        onChangeText={(text) => setFormData({ ...formData, password: text })}
                        placeholderTextColor="#999"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Vehicle Plate Number"
                        autoCapitalize="characters"
                        value={formData.plateNumber}
                        onChangeText={(text) => setFormData({ ...formData, plateNumber: text })}
                        placeholderTextColor="#999"
                    />

                    <View style={styles.typeContainer}>
                        <Text style={styles.label}>Vehicle Type:</Text>
                        <View style={styles.radioGroup}>
                            <TouchableOpacity
                                style={[styles.radioButton, formData.type === 'bike' && styles.radioActive]}
                                onPress={() => setFormData({ ...formData, type: 'bike' })}
                            >
                                <Text style={[styles.radioText, formData.type === 'bike' && styles.radioTextActive]}>Bike</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.radioButton, formData.type === 'scooter' && styles.radioActive]}
                                onPress={() => setFormData({ ...formData, type: 'scooter' })}
                            >
                                <Text style={[styles.radioText, formData.type === 'scooter' && styles.radioTextActive]}>Scooter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.uploadContainer}>
                        <Text style={styles.label}>Documents (License/ID):</Text>
                        <TouchableOpacity style={styles.uploadButton} onPress={selectDocument}>
                            <Text style={styles.uploadButtonText}>
                                {document ? 'Change Document' : 'Select Document'}
                            </Text>
                        </TouchableOpacity>
                        {document && (
                            <Text style={styles.fileName}>Selected: {document.fileName || 'Image picked'}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Register</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.loginLinkText}>Already have an account? Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    inner: {
        padding: 32,
        justifyContent: 'center',
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#111',
        textAlign: 'center',
        marginBottom: 8,
        marginTop: 60,
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        marginBottom: 48,
        fontWeight: '500',
    },
    input: {
        height: 60,
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 16,
        paddingHorizontal: 20,
        marginBottom: 20,
        fontSize: 16,
        color: '#111',
        fontWeight: '500',
    },
    typeContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: '#888',
        fontWeight: '700',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    radioGroup: {
        flexDirection: 'row',
        gap: 12,
    },
    radioButton: {
        flex: 1,
        height: 50,
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioActive: {
        backgroundColor: '#111',
        borderColor: '#111',
    },
    radioText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '700',
    },
    radioTextActive: {
        color: '#FFF',
    },
    uploadContainer: {
        marginBottom: 32,
    },
    uploadButton: {
        height: 60,
        borderWidth: 2,
        borderColor: '#111',
        borderStyle: 'dashed',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9F9F9',
    },
    uploadButtonText: {
        color: '#111',
        fontWeight: '800',
        fontSize: 14,
    },
    fileName: {
        marginTop: 10,
        fontSize: 12,
        color: '#2E7D32',
        textAlign: 'center',
        fontWeight: '600',
    },
    button: {
        height: 60,
        backgroundColor: '#111',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
    },
    loginLink: {
        marginTop: 32,
        alignItems: 'center',
        marginBottom: 60,
    },
    loginLinkText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RegisterScreen;
