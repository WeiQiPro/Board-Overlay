import { debug } from '../utils/debugger.js';

export class CommentatorSender {
    constructor() {
        this.enabled = false;
        this.vdoFrame = null;
        this.roomName = null;
        debug.log('📡 CommentatorSender initialized');
    }
    
    enable(roomName) {
        if (!roomName) {
            debug.error('❌ No room name provided for commentator sender');
            return;
        }
        
        this.roomName = roomName;
        this.enabled = true;
        
        // Use the existing OBS iframe - no need to create a new one
        this.vdoFrame = document.getElementById('obs');
        
        if (!this.vdoFrame) {
            debug.error('❌ No OBS iframe found - cannot send data');
            return;
        }
        
        debug.log('📡 CommentatorSender enabled using existing OBS iframe for room:', roomName);
    }
    
    sendCommand(command) {
        if (!this.enabled || !this.vdoFrame) {
            debug.log('📡 Not sending - sender not enabled or no frame');
            return;
        }
        
        try {
            this.vdoFrame.contentWindow.postMessage({
                "sendData": JSON.stringify(command),
                "type": "pcs"
            }, '*');
            
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
} 