import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../api/client';

const SOCKET_URL = BASE_URL; // Use same port as API (8000)

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    async connect() {
        if (this.socket?.connected) {
            console.log('[SocketService] Socket already connected');
            return;
        }

        try {
            const driverData = await AsyncStorage.getItem('driverData');
            if (!driverData) {
                console.log('[SocketService] ❌ No driver data found, cannot connect socket');
                return;
            }

            const driver = JSON.parse(driverData);
            console.log('[SocketService] Driver ID:', driver._id);
            console.log('[SocketService] Connecting to:', SOCKET_URL);

            this.socket = io(SOCKET_URL, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
            });

            this.socket.on('connect', () => {
                console.log('[SocketService] ✅ Socket connected:', this.socket.id);
                // Join driver's personal room
                this.socket.emit('join', driver._id);
                console.log('[SocketService] Joined room:', driver._id);
            });

            this.socket.on('disconnect', () => {
                console.log('[SocketService] ❌ Socket disconnected');
            });

            this.socket.on('connect_error', (error) => {
                console.error('[SocketService] ❌ Socket connection error:', error);
            });

        } catch (error) {
            console.error('[SocketService] ❌ Error connecting socket:', error);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
            console.log('Socket disconnected and cleaned up');
        }
    }

    on(eventName, callback) {
        if (!this.socket) {
            console.warn('Socket not connected, cannot listen to events');
            return;
        }

        // Store listener for cleanup
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName).push(callback);

        this.socket.on(eventName, callback);
    }

    off(eventName, callback) {
        if (!this.socket) return;

        this.socket.off(eventName, callback);

        // Remove from listeners map
        if (this.listeners.has(eventName)) {
            const callbacks = this.listeners.get(eventName);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(eventName, data) {
        if (!this.socket) {
            console.warn('Socket not connected, cannot emit events');
            return;
        }
        this.socket.emit(eventName, data);
    }

    removeAllListeners(eventName) {
        if (!this.socket) return;

        this.socket.removeAllListeners(eventName);
        this.listeners.delete(eventName);
    }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
