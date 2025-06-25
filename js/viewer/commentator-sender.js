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
        debug.log('📡 CommentatorSender initialized');
        this.setupPingListener();
    }
    
    setupPingListener() {
        // Listen for ping responses from viewers
        window.addEventListener('message', (e) => {
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
                        this.handleGridRequest(message);
                    } else {
                        debug.log('📡 Host received unknown action:', message.action);
                    }
                } catch (error) {
                    debug.log('📡 Host received non-JSON data:', e.data.dataReceived);
                }
            }
        });
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
        }, 1000); // Send ping every second
        
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
    
        enable(roomName) {
        if (!roomName) {
            debug.error('❌ No room name provided for commentator sender');
            return;
        }

        this.roomName = roomName;
        this.enabled = true;
        
        // Use existing OBS iframe for data communication
        this.vdoFrame = document.getElementById('obs');
        
        if (!this.vdoFrame) {
            debug.error('❌ OBS iframe not found');
            return;
        }
        
        debug.log('📡 CommentatorSender enabled using existing OBS iframe');
        debug.log('📡 OBS iframe src:', this.vdoFrame.src);
        
        // Connection status check - give time for VDO.ninja to establish data channel
        setTimeout(() => {
            this.isConnected = true;
            this.startHostPing();
            debug.log('📡 Host ping system started after connection delay');
        }, 3000);
    }
    
    disable() {
        this.enabled = false;
        this.stopHostPing();
        this.isConnected = false;
        // Don't remove the OBS iframe, just clear reference
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