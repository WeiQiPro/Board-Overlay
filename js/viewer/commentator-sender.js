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
                try {
                    const message = JSON.parse(e.data.dataReceived);
                    if (message.action === 'ping-response') {
                        this.handlePingResponse(message);
                    } else if (message.action === 'viewer-ping') {
                        this.handleViewerPing(message);
                    }
                } catch (error) {
                    // Not a JSON message, ignore
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
        
        // Create clean dedicated iframe for data communication (like VDO drawing tool)
        const iframe = document.createElement("iframe");
        iframe.src = `https://vdo.ninja/?push=${roomName}&vd=0&ad=0&autostart&cleanoutput`;
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.position = "fixed";
        iframe.style.left = "-100px";
        iframe.style.top = "-100px";
        iframe.id = "dataChannelFrame";
        document.body.appendChild(iframe);
        this.vdoFrame = iframe;
        
        debug.log('📡 CommentatorSender enabled with clean data channel iframe for room:', roomName);
        debug.log('📡 Data channel iframe src:', this.vdoFrame.src);
        
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
        if (this.vdoFrame) {
            this.vdoFrame.remove();
            this.vdoFrame = null;
        }
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