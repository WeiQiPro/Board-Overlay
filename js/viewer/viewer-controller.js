import { debug } from '../utils/debugger.js';

export class ViewerController {
    constructor() {
        this.vdoFrame = null;
        this.cursorX = 0;
        this.cursorY = 0;
        this.cursorVisible = false;
        // Lerping variables
        this.targetX = 0;
        this.targetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.lerpSpeed = 0.3; // Adjust for smoothness (0.1 = very smooth, 0.5 = responsive)
        // Ping system
        this.pingInterval = null;
        this.lastHostPingTime = 0;
        this.hostPingTimes = [];
        this.connectionEstablished = false;
        debug.log('🎥 ViewerController initialized');
        this.setupVDOViewer();
        this.setupCursorDisplay();
        this.startCursorAnimation();
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

    // Create data channel room name using seeded UUID (same as host)
    createDataChannelRoomName(roomName) {
        // Create seed from room name + date for daily uniqueness
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const seedString = `${roomName}-${today}`;
        const seed = this.stringToSeed(seedString);
        
        // Generate consistent UUID-like identifier
        const uuid = this.generateSeededUUID(seed);
        const dataRoomName = `Baduk-${uuid}`;
        
        debug.log('🎥 Created data channel room name:', dataRoomName, 'from OBS room:', roomName, 'seed:', seed);
        return dataRoomName;
    }
    
    setupVDOViewer() {
        // Get the room name from URL parameters
        const params = new URLSearchParams(window.location.search);
        let obsUrl = params.get('obs');
        
        if (!obsUrl) {
            debug.error('❌ No OBS URL found in parameters');
            return;
        }
        
        // Decode the URL to extract room name
        obsUrl = decodeURIComponent(obsUrl);
        if (obsUrl.includes('%')) {
            obsUrl = decodeURIComponent(obsUrl);
        }
        
        // Extract room name from the obs URL
        const obsParams = new URLSearchParams(obsUrl.split('?')[1] || '');
        const roomName = obsParams.get('view') || obsParams.get('push');
        
        if (!roomName) {
            debug.error('❌ No room name found in OBS URL');
            return;
        }
        
        // Create unique data channel room name (same hash function as host)
        const dataRoomName = this.createDataChannelRoomName(roomName);
        
        // Create invisible data channel iframe for host-viewer communication
        const dataIframe = document.createElement("iframe");
        dataIframe.src = `https://vdo.ninja/?view=${dataRoomName}&cleanoutput`;
        dataIframe.style.width = "0px";
        dataIframe.style.height = "0px";
        dataIframe.style.position = "fixed";
        dataIframe.style.left = "-100px";
        dataIframe.style.top = "-100px";
        dataIframe.id = "viewerDataChannelFrame";
        document.body.appendChild(dataIframe);
        this.vdoFrame = dataIframe;
        
        debug.log('🎥 Created dedicated data channel iframe for viewer');
        debug.log('🎥 Data channel room:', dataRoomName);
        debug.log('🎥 Data iframe src:', this.vdoFrame.src);
        
        // Listen for messages
        this.setupMessageListener();
        
        // Start viewer ping after connection is established
        setTimeout(() => {
            this.connectionEstablished = true;
            this.startViewerPing();
            debug.log('🎥 Viewer ping system started after connection delay');
            
            // Grid coordinates will be sent automatically with stone placements
            debug.log('🎥 Viewer ready - grid coordinates will be received with stone placements');
        }, 3000);
    }
    
    setupMessageListener() {
        const eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
        const eventer = window[eventMethod];
        const messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";
        
        eventer(messageEvent, (e) => {
            // Log ALL messages for debugging
            debug.log('🎥 Raw message received:', {
                origin: e.origin,
                source: e.source === this.vdoFrame?.contentWindow ? 'VDO_FRAME' : 'OTHER',
                data: e.data,
                hasDataReceived: "dataReceived" in e.data,
                dataType: typeof e.data,
                keys: Object.keys(e.data || {})
            });
            
            if (e.source !== this.vdoFrame.contentWindow) {
                debug.log('🎥 Message ignored - not from VDO frame');
                return;
            }
            
            // Check for data channel connection status
            if (e.data && e.data.action) {
                if (e.data.action === 'requested-stream' || e.data.action.includes('connection')) {
                    debug.log('🔗 Connection status message:', e.data);
                }
            }
            
            if ("dataReceived" in e.data) {
                debug.log('🎥 DataReceived found:', e.data.dataReceived);
                try {
                    const command = JSON.parse(e.data.dataReceived);
                    debug.log('🎥 Received command:', command);
                    this.processCommand(command);
                } catch (error) {
                    debug.log('🎥 Non-JSON data received:', e.data.dataReceived);
                }
            } else {
                debug.log('🎥 Message without dataReceived:', e.data);
            }
        });
        
        debug.log('🎥 VDO viewer message listener setup complete');
    }
    
    processCommand(command) {
        debug.log('🎯 Processing command:', command);
        
        switch (command.action) {
            case 'host-ping':
                this.handleHostPing(command);
                break;
                
            case 'viewer-ping-response':
                this.handleViewerPingResponse(command);
                break;
                
            case 'set-grid':
                this.setGrid(command.points);
                break;
                
            case 'grid-info':
                this.handleGridInfo(command);
                break;
                
            case 'place-stone':
                this.placeStone(command.x, command.y, command.color);
                break;
                
            case 'draw-tool':
                this.handleDrawing(command);
                break;
                
            case 'draw-batch':
                this.handleDrawingBatch(command);
                break;
                
            case 'add-mark':
                this.addMark(command.type, command.x, command.y, command.text);
                break;
                
            case 'clear-drawing':
                this.clearDrawing();
                break;
                
            case 'clear-all':
                this.clearAll();
                break;
                
            case 'reset-board':
                this.resetBoard();
                break;
                
            case 'toggle-grid':
                this.toggleGrid(command.visible);
                break;
                
            case 'set-tool':
                this.setTool(command.tool);
                break;
                
            case 'cursor-move':
                this.updateCursor(command.x, command.y);
                break;
                
            case 'switch-color':
                this.switchCurrentColor(command.color);
                break;
                
            default:
                debug.log('🤷 Unknown command:', command.action);
                break;
        }
    }
    
    placeStone(x, y, color) {
        if (color === 'BOARD' || color === 'REMOVE_BOARD') {
            // Handle board stones
            if (window.overlay && window.overlay.placeBoardStone) {
                window.overlay.placeBoardStone(x, y, color);
                debug.log('🔴 Board stone action:', color, 'at:', x, y);
            }
        } else {
            // Handle regular stones
            if (window.overlay && window.overlay.placeStone) {
                window.overlay.placeStone(x, y, color);
                debug.log('🔴 Placed stone at:', x, y, 'color:', color);
            }
        }
    }
    
    handleDrawing(command) {
        if (window.drawingLayer) {
            switch (command.drawAction) {
                case 'start':
                    window.drawingLayer.startDrawingAt(command.x, command.y, command.tool);
                    break;
                case 'draw':
                    window.drawingLayer.drawTo(command.x, command.y);
                    break;
                case 'end':
                    window.drawingLayer.endDrawing();
                    break;
            }
            debug.log('✏️ Drawing action:', command.drawAction, 'at:', command.x, command.y);
        }
    }

    handleDrawingBatch(command) {
        if (window.drawingLayer && command.points && command.points.length > 0) {
            // Apply smooth interpolation between points for better visual quality
            this.drawSmoothBatch(command.points, command.color);
            debug.log(`🎨 Processed drawing batch with ${command.points.length} points`);
        }
    }

    drawSmoothBatch(points, color) {
        if (!window.drawingLayer || !window.drawingLayer.context || points.length === 0) return;
        
        const context = window.drawingLayer.context;
        const originalColor = context.strokeStyle;
        const originalLineWidth = context.lineWidth;
        
        // Set drawing properties
        if (color) {
            context.strokeStyle = color;
        }
        context.lineWidth = 2; // Ensure consistent line width
        context.lineCap = 'round'; // Smooth line ends
        context.lineJoin = 'round'; // Smooth line joins
        
        // If we only have one point, draw a small dot
        if (points.length === 1) {
            context.beginPath();
            context.arc(points[0][0], points[0][1], 1, 0, 2 * Math.PI);
            context.fill();
            return;
        }
        
        // Use quadratic curves for smooth interpolation between points
        context.beginPath();
        context.moveTo(points[0][0], points[0][1]);
        
        // For smoother curves, we'll use every point as a control point
        for (let i = 1; i < points.length; i++) {
            const currentPoint = points[i];
            
            if (i === points.length - 1) {
                // Last point - draw straight line
                context.lineTo(currentPoint[0], currentPoint[1]);
            } else {
                // Use next point to create smooth curve
                const nextPoint = points[i + 1];
                const controlX = (currentPoint[0] + nextPoint[0]) / 2;
                const controlY = (currentPoint[1] + nextPoint[1]) / 2;
                
                context.quadraticCurveTo(currentPoint[0], currentPoint[1], controlX, controlY);
            }
        }
        
        context.stroke();
        
        // Restore original properties
        context.strokeStyle = originalColor;
        context.lineWidth = originalLineWidth;
    }
    
    clearDrawing() {
        // Clear only the drawing layer
        if (window.drawingLayer && window.drawingLayer.clearCanvas) {
            window.drawingLayer.clearCanvas();
            debug.log('🧹 Cleared drawing layer only');
        }
    }
    
    clearAll() {
        // Clear both drawing layer AND stones
        if (window.drawingLayer && window.drawingLayer.clearCanvas) {
            window.drawingLayer.clearCanvas();
            debug.log('🧹 Cleared drawing layer');
        }
        if (window.overlay && window.overlay.clearStones) {
            window.overlay.clearStones();
            debug.log('🧹 Cleared stones');
        }
        
        // Reset letter stack and button
        if (window.overlay) {
            // Reset letter stack
            window.overlay.letterStack = [];
            // Single letters A-Z
            for (let i = 65; i <= 90; i++) {
                window.overlay.letterStack.push(String.fromCharCode(i));
            }
            // Double letters AA-ZZ
            for (let i = 65; i <= 90; i++) {
                for (let j = 65; j <= 90; j++) {
                    window.overlay.letterStack.push(String.fromCharCode(i) + String.fromCharCode(j));
                }
            }
            
            // Update letter button
            const letterBtn = document.getElementById('LetterBtn');
            if (letterBtn) {
                letterBtn.textContent = window.overlay.letterStack[0];
            }
            debug.log('🧹 Reset letter stack');
        }
    }
    
    resetBoard() {
        if (window.overlay && window.overlay.resetGrid) {
            window.overlay.resetGrid();
            debug.log('🔄 Reset board');
        }
    }
    
    toggleGrid(visible) {
        if (window.overlay) {
            // In viewer mode, permanently disable grid visibility
            window.overlay.show = false;
            window.overlay.updateGridButtonState();
            debug.log('👁️ Grid permanently disabled in viewer mode');
        }
    }
    
    setTool(tool) {
        if (window.setCurrentTool) {
            window.setCurrentTool(tool);
            debug.log('🔧 Set tool:', tool);
        }
        
        // Update the UI to show the active tool
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        const toolButtons = {
            'BLACK': 'BlackStoneBtn',
            'WHITE': 'WhiteStoneBtn', 
            'ALTERNATING': 'AlternatingBtn',
            'PEN': 'PenBtn',
            'TRIANGLE': 'TriangleBtn',
            'CIRCLE': 'CircleBtn',
            'SQUARE': 'SquareBtn',
            'LETTER': 'LetterBtn'
        };
        
        const buttonId = toolButtons[tool];
        if (buttonId) {
            const button = document.getElementById(buttonId);
            if (button) {
                button.classList.add('active');
            }
        }
    }
    
    addMark(type, x, y, text = '') {
        if (window.drawingLayer && window.drawingLayer.addMark) {
            window.drawingLayer.addMark(type, x, y, text);
            debug.log('📍 Added mark:', type, 'at:', x, y, text ? `text: ${text}` : '');
            
            // Update letter button if it's a letter mark
            if (type === 'LETTER' && text) {
                const letterBtn = document.getElementById('LetterBtn');
                if (letterBtn && window.overlay && window.overlay.letterStack) {
                    // Remove the used letter from the stack
                    const letterIndex = window.overlay.letterStack.indexOf(text);
                    if (letterIndex >= 0) {
                        window.overlay.letterStack.splice(letterIndex, 1);
                    }
                    // Update button to show next letter
                    letterBtn.textContent = window.overlay.letterStack.length > 0 ? window.overlay.letterStack[0] : 'A';
                }
            }
        }
    }
    
    setupCursorDisplay() {
        // Create cursor element
        this.cursorElement = document.createElement('div');
        this.cursorElement.id = 'fake-cursor';
        this.cursorElement.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            pointer-events: none;
            z-index: 999999 !important;
            transform: rotate(-15deg);
            display: none;
        `;
        
        // Create SVG cursor (white arrow with black border)
        this.cursorElement.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" style="filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.8));">
                <path d="M0,0 L0,14 L4,10 L7,13 L9,11 L6,8 L10,8 Z" 
                      fill="white" 
                      stroke="black" 
                      stroke-width="1"/>
            </svg>
        `;
        
        document.body.appendChild(this.cursorElement);
        debug.log('🖱️ Fake cursor element created');
    }
    
    updateCursor(x, y) {
        // Set target position for smooth interpolation (canvas coordinates)
        this.targetX = x;
        this.targetY = y;
        this.cursorVisible = true;
        
        // Always show cursor when receiving updates
        this.cursorElement.style.display = 'block';
        
        // Hide cursor after 3 seconds of inactivity (longer timeout)
        clearTimeout(this.cursorTimeout);
        this.cursorTimeout = setTimeout(() => {
            this.cursorElement.style.display = 'none';
            this.cursorVisible = false;
        }, 3000);
    }
    
    startCursorAnimation() {
        // Start animation loop for smooth cursor movement
        const animateCursor = () => {
            // Always animate cursor, regardless of visibility state
            // Linear interpolation (lerp) between current and target positions
            this.currentX += (this.targetX - this.currentX) * this.lerpSpeed;
            this.currentY += (this.targetY - this.currentY) * this.lerpSpeed;
            
            // Update cursor position on screen
            this.updateCursorPosition();
            
            // Continue animation loop
            requestAnimationFrame(animateCursor);
        };
        
        // Start the animation
        requestAnimationFrame(animateCursor);
        debug.log('🎬 Cursor animation loop started');
    }
    
    updateCursorPosition() {
        // Get the canvas position and scale
        const canvas = document.getElementById('overlay');
        if (canvas && this.cursorElement) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = rect.width / canvas.width;
            const scaleY = rect.height / canvas.height;
            
            // Convert canvas coordinates to page coordinates (including scroll)
            const pageX = rect.left + window.scrollX + (this.currentX * scaleX);
            const pageY = rect.top + window.scrollY + (this.currentY * scaleY);
            
            // Position the cursor element relative to the page
            this.cursorElement.style.left = pageX + 'px';
            this.cursorElement.style.top = pageY + 'px';
        }
    }
    
    startViewerPing() {
        // Only start if connection is established
        if (!this.connectionEstablished) {
            debug.log('🏓 Waiting for connection before starting viewer ping');
            return;
        }
        
        // Send ping to host every 30 seconds
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        
        this.pingInterval = setInterval(() => {
            this.sendViewerPing();
        }, 30000); // Send ping every 30 seconds (half a minute)
        
        debug.log('🏓 Started viewer ping system');
    }
    
    stopViewerPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        debug.log('🏓 Stopped viewer ping system');
    }
    
    sendViewerPing() {
        if (!this.vdoFrame || !this.connectionEstablished) return;
        
        const timestamp = Date.now();
        try {
            this.vdoFrame.contentWindow.postMessage({
                "sendData": JSON.stringify({
                    action: 'viewer-ping',
                    timestamp: timestamp
                }),
                "type": "pcs"
            }, '*');
            
            debug.log('🏓 Sent viewer ping:', timestamp);
        } catch (error) {
            debug.error('❌ Failed to send viewer ping:', error);
        }
    }
    
    handleHostPing(message) {
        const responseTime = Date.now() - message.timestamp;
        this.hostPingTimes.push(responseTime);
        
        // Keep only last 10 ping times
        if (this.hostPingTimes.length > 10) {
            this.hostPingTimes.shift();
        }
        
        const avgResponseTime = this.hostPingTimes.reduce((a, b) => a + b, 0) / this.hostPingTimes.length;
        debug.log(`🏓 Host ping received: ${responseTime}ms delay (avg: ${Math.round(avgResponseTime)}ms)`);
        
        // Send ping response back to host
        try {
            this.vdoFrame.contentWindow.postMessage({
                "sendData": JSON.stringify({
                    action: 'ping-response',
                    originalTimestamp: message.timestamp,
                    responseTimestamp: Date.now()
                }),
                "type": "pcs"
            }, '*');
            
            debug.log('🏓 Sent ping response to host');
        } catch (error) {
            debug.error('❌ Failed to send ping response:', error);
        }
    }
    
    handleViewerPingResponse(message) {
        const responseTime = Date.now() - message.originalTimestamp;
        debug.log(`🏓 Host ping response received: ${responseTime}ms total round-trip`);
    }
    
    handleGridInfo(command) {
        debug.log('📐 Received current grid info from host:', command);
        
        // Mark that we received a grid response
        this.gridReceived = true;
        if (this.gridRequestTimeout) {
            clearTimeout(this.gridRequestTimeout);
            this.gridRequestTimeout = null;
        }
        
        if (command.points && command.points.length === 4) {
            this.setGrid(command.points);
            debug.log('📐 Applied current grid from host');
        } else {
            debug.log('📐 Host has no grid set currently');
        }
    }
    
    setGrid(points) {
        if (window.overlay && points && points.length === 4) {
            window.overlay.points = points;
            window.overlay.grid = window.overlay.generateGrid(points);
            window.overlay.isGridSet = true;
            debug.log('📐 Grid coordinates set:', points);
            
            // Show grid briefly to confirm it was received
            const wasVisible = window.overlay.show;
            window.overlay.show = true;
            window.overlay.updateGridButtonState();
            
            setTimeout(() => {
                window.overlay.show = wasVisible;
                window.overlay.updateGridButtonState();
            }, 2000);
        }
    }
    
    requestGridInfo() {
        if (!this.vdoFrame || !this.connectionEstablished) {
            debug.log('📐 Cannot request grid - no frame or connection not established');
            return;
        }
        
        const message = {
            "sendData": JSON.stringify({
                action: 'request-grid',
                timestamp: Date.now()
            }),
            "type": "pcs"
        };
        
        try {
            this.vdoFrame.contentWindow.postMessage(message, '*');
            debug.log('📐 Sent grid request message:', message);
            debug.log('📐 Requested current grid info from host');
        } catch (error) {
            debug.error('❌ Failed to request grid info:', error);
        }
    }
    
    requestGridInfoWithRetry() {
        this.gridRequestAttempts = 0;
        this.maxGridRequestAttempts = 5;
        this.gridRequestInterval = 3000; // 3 seconds between attempts
        
        const attemptRequest = () => {
            this.gridRequestAttempts++;
            debug.log(`📐 Grid request attempt ${this.gridRequestAttempts}/${this.maxGridRequestAttempts}`);
            
            this.requestGridInfo();
            
            // Set up timeout to retry if no response received
            if (this.gridRequestAttempts < this.maxGridRequestAttempts) {
                this.gridRequestTimeout = setTimeout(() => {
                    if (!this.gridReceived) {
                        debug.log('📐 No grid response received, retrying...');
                        attemptRequest();
                    }
                }, this.gridRequestInterval);
            } else {
                debug.log('📐 Max grid request attempts reached, giving up');
            }
        };
        
        this.gridReceived = false;
        attemptRequest();
    }
    
    switchCurrentColor(color) {
        if (window.overlay) {
            window.overlay.currentColor = color;
            debug.log('🎨 Switched current color to:', color);
        }
    }
} 