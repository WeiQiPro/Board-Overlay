import { debug } from '../utils/debugger.js';

export class CommentatorSender {
    constructor() {
        this.enabled = false;
        this.vdoFrame = null;
        this.roomName = null;
        this.pingInterval = null;
        this.lastPingTime = 0;
        this.pingResponseTimes = [];
        this.isConnected = false;
        this.messageListener = null; // Store reference to listener for cleanup
        debug.log('📡 CommentatorSender initialized');
    }
    
    setupPingListener() {
        // Remove existing listener if any
        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
        }
        
        // Create new listener
        this.messageListener = (e) => {
            // Debug all VDO messages
            if (e.origin === 'https://vdo.ninja') {
                debug.log('📡 Host received VDO message from:', e.source === this.vdoFrame?.contentWindow ? 'DATA_FRAME' : 'OTHER_FRAME', e.data);
            }
            
            // Only process messages from our data channel iframe
            if (!this.vdoFrame || e.source !== this.vdoFrame.contentWindow) {
                return;
            }
            
            if (e.data && "dataReceived" in e.data) {
                debug.log('📡 Host received data:', e.data.dataReceived);
                try {
                    const message = JSON.parse(e.data.dataReceived);
                    debug.log('📡 Host parsed message:', message);
                    if (message.action === 'ping-response') {
                        this.handlePingResponse(message);
                    } else if (message.action === 'viewer-ping') {
                        this.handleViewerPing(message);
                    } else if (message.action === 'request-grid') {
                        debug.log('📐 Host received grid request from viewer (deprecated - grid sent with stones now)');
                    } else {
                        debug.log('📡 Host received unknown action:', message.action);
                    }
                } catch (error) {
                    debug.log('📡 Host received non-JSON data:', e.data.dataReceived);
                }
            } else {
                // Log all messages to see what's coming through
                debug.log('📡 Host received non-data message:', e.data);
            }
        };
        
        // Add the listener
        window.addEventListener('message', this.messageListener);
        debug.log('📡 Host message listener setup complete');
    }
    
    handleViewerPing(message) {
        const responseTime = Date.now() - message.timestamp;
        debug.log(`🏓 Viewer ping received: ${responseTime}ms delay`);
        
        // Send response back to viewer
        this.sendCommand({
            action: 'viewer-ping-response',
            originalTimestamp: message.timestamp,
            responseTimestamp: Date.now()
        });
    }
    
    handlePingResponse(message) {
        const responseTime = Date.now() - message.originalTimestamp;
        this.pingResponseTimes.push(responseTime);
        
        // Keep only last 10 ping times
        if (this.pingResponseTimes.length > 10) {
            this.pingResponseTimes.shift();
        }
        
        const avgResponseTime = this.pingResponseTimes.reduce((a, b) => a + b, 0) / this.pingResponseTimes.length;
        debug.log(`🏓 Ping response from viewer: ${responseTime}ms (avg: ${Math.round(avgResponseTime)}ms)`);
    }
    
    handleGridRequest(message) {
        debug.log('📐 Viewer requested current grid info');
        
        // Get current grid from overlay
        const currentGrid = window.overlay && window.overlay.points && window.overlay.points.length === 4 
            ? window.overlay.points 
            : null;
        
        // Send current grid info back to viewer
        this.sendCommand({
            action: 'grid-info',
            points: currentGrid,
            isGridSet: !!(currentGrid),
            timestamp: Date.now()
        });
        
        debug.log('📐 Sent current grid info to viewer:', currentGrid);
    }
    
    startHostPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            this.sendHostPing();
        }, 30000); // Send ping every 30 seconds (half a minute)
        
        debug.log('🏓 Started host ping system');
    }
    
    stopHostPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        debug.log('🏓 Stopped host ping system');
    }
    
    sendHostPing() {
        const timestamp = Date.now();
        this.lastPingTime = timestamp;
        
        this.sendCommand({
            action: 'host-ping',
            timestamp: timestamp
        });
    }
    
        // Seeded random number generator (LCG - Linear Congruential Generator)
    seededRandom(seed) {
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);
        return () => {
            seed = (a * seed + c) % m;
            return seed / m;
        };
    }

    // Create a hash from string for seeding
    stringToSeed(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Generate UUID-like string with seed for consistent output
    generateSeededUUID(seed) {
        const rng = this.seededRandom(seed);
        
        // Generate 32 hex characters in UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        const hex = () => Math.floor(rng() * 16).toString(16);
        const uuid = [
            // 8 hex chars
            hex() + hex() + hex() + hex() + hex() + hex() + hex() + hex(),
            // 4 hex chars
            hex() + hex() + hex() + hex(),
            // 4 hex chars with version 4
            '4' + hex() + hex() + hex(),
            // 4 hex chars with variant bits
            (8 + Math.floor(rng() * 4)).toString(16) + hex() + hex() + hex(),
            // 12 hex chars
            hex() + hex() + hex() + hex() + hex() + hex() + hex() + hex() + hex() + hex() + hex() + hex()
        ].join('-');
        
        return uuid;
    }

    // Create data channel room name using seeded UUID
    createDataChannelRoomName(roomName) {
        // Create seed from room name + date for daily uniqueness
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const seedString = `${roomName}-${today}`;
        const seed = this.stringToSeed(seedString);
        
        // Generate consistent UUID-like identifier
        const uuid = this.generateSeededUUID(seed);
        const dataRoomName = `Baduk-${uuid}`;
        
        debug.log('📡 Created data channel room name:', dataRoomName, 'from OBS room:', roomName, 'seed:', seed);
        return dataRoomName;
    }
    
    enable(roomName) {
        if (!roomName) {
            debug.error('❌ No room name provided for commentator sender');
            return;
        }
        
        this.roomName = roomName;
        this.enabled = true;
        
        // Create unique data channel room name
        const dataRoomName = this.createDataChannelRoomName(roomName);
        
        // Create invisible data channel iframe for host-viewer communication
        const dataIframe = document.createElement("iframe");
        dataIframe.src = `https://vdo.ninja/?push=${dataRoomName}&vd=0&ad=0&autostart&cleanoutput`;
        dataIframe.style.width = "0px";
        dataIframe.style.height = "0px";
        dataIframe.style.position = "fixed";
        dataIframe.style.left = "-100px";
        dataIframe.style.top = "-100px";
        dataIframe.id = "hostDataChannelFrame";
        document.body.appendChild(dataIframe);
        this.vdoFrame = dataIframe;
        
        debug.log('📡 CommentatorSender enabled with dedicated data channel iframe');
        debug.log('📡 Data channel room:', dataRoomName);
        debug.log('📡 Data iframe src:', this.vdoFrame.src);
        
        // Connection status check - give time for VDO.ninja to establish data channel
        setTimeout(() => {
            this.isConnected = true;
            this.startHostPing();
            debug.log('📡 Host ping system started after connection delay');
        }, 1000); // Reduced from 3000ms to 1000ms for faster reconnection
        
        this.setupPingListener();
    }
    
    disable() {
        this.enabled = false;
        this.stopHostPing();
        this.isConnected = false;
        
        // Clean up message listener
        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
            this.messageListener = null;
        }
        
        if (this.vdoFrame && this.vdoFrame.id === 'hostDataChannelFrame') {
            this.vdoFrame.remove();
        }
        this.vdoFrame = null;
        debug.log('📡 CommentatorSender disabled');
    }
    
    sendCommand(command) {
        if (!this.enabled || !this.vdoFrame || !this.isConnected) {
            debug.log('📡 Not sending - sender not enabled, no frame, or not connected');
            return;
        }
        
        try {
            const message = {
                "sendData": JSON.stringify(command),
                "type": "pcs"
            };
            
            debug.log('📡 Sending via data channel:', message);
            
            this.vdoFrame.contentWindow.postMessage(message, '*');
            
            debug.log('📡 Sent command:', command);
        } catch (error) {
            debug.error('❌ Failed to send command:', error);
        }
    }
    
    // Convenience methods for different actions
    sendStone(x, y, color) {
        this.sendCommand({
            action: 'place-stone',
            x: x,
            y: y,
            color: color,
            timestamp: Date.now()
        });
    }
    
    sendDrawing(drawAction, x, y, tool) {
        this.sendCommand({
            action: 'draw-tool',
            drawAction: drawAction,
            x: x,
            y: y,
            tool: tool,
            timestamp: Date.now()
        });
    }
    
    sendGridToggle(visible) {
        this.sendCommand({
            action: 'toggle-grid',
            visible: visible,
            timestamp: Date.now()
        });
    }
    
    sendReset() {
        this.sendCommand({
            action: 'reset-board',
            timestamp: Date.now()
        });
    }
    
    sendClear() {
        this.sendCommand({
            action: 'clear-drawing',
            timestamp: Date.now()
        });
    }
    
    sendClearAll() {
        this.sendCommand({
            action: 'clear-all',
            timestamp: Date.now()
        });
    }
    
    sendClearDrawing() {
        this.sendCommand({
            action: 'clear-drawing',
            timestamp: Date.now()
        });
    }
    
    sendTool(tool) {
        this.sendCommand({
            action: 'set-tool',
            tool: tool,
            timestamp: Date.now()
        });
    }
    
    sendGridCoordinates(points) {
        this.sendCommand({
            action: 'set-grid',
            points: points,
            timestamp: Date.now()
        });
    }
} 