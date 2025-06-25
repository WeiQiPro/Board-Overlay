import { CONST } from '../constants.js';
import { debug } from '../utils/debugger.js';

export class DrawingLayer {
    constructor(element) {
        this.canvas = document.getElementById(element);
        this.context = this.canvas.getContext("2d");
        this.isDrawing = false;
        this.marks = [];
        this.paths = [];  // Store drawing paths
        this.currentPath = null;
        
        // Drawing batch system for network optimization
        this.drawingBatch = [];
        this.batchInterval = null;
        this.batchRate = 100; // Send batches every 100ms (10 times per second)
        this.maxBatchSize = 20; // Maximum points per batch
        
        this.initializeCanvas();
        this.bindEventListeners();
    }

    initializeCanvas() {
        this.canvas.width = CONST.CANVAS.WIDTH;
        this.canvas.height = CONST.CANVAS.HEIGHT;
        
        // Make canvas focusable for keyboard shortcuts
        this.canvas.tabIndex = 0;
        this.canvas.style.outline = 'none'; // Remove focus outline
        this.context.strokeStyle = this.getPenColor();
        this.context.lineWidth = 2;
        this.context.font = '24px Arial';
    }

    getPenColor() {
        const colorInput = document.getElementById('markupColor');
        return colorInput ? colorInput.value : 'red';
    }

    bindEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        
        // Ensure canvas gets focus when clicked for keyboard shortcuts
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete') {
                this.clearCanvas();
            }
        });
        // Listen for color changes
        const colorInput = document.getElementById('markupColor');
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                this.context.strokeStyle = this.getPenColor();
            });
        }
    }

    startDrawing(e) {
        if (window.currentTool !== 'PEN') return;
        this.isDrawing = true;
        const [x, y] = this.getCanvasCoords(e.offsetX, e.offsetY);
        this.currentPath = {
            points: [[x, y]],
            type: 'path',
            color: this.getPenColor()
        };
        this.context.beginPath();
        this.context.strokeStyle = this.getPenColor();
        this.context.moveTo(x, y);
        
        // Send start command immediately
        if (window.commentatorSender && !window.isViewerMode) {
            window.commentatorSender.sendDrawing('start', x, y, 'PEN');
        }
        
        // Start batching system for drawing points
        this.startDrawingBatch();
    }

    startDrawingBatch() {
        // Clear any existing batch
        this.drawingBatch = [];
        
        // Clear any existing interval
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
        
        // Start new batch interval
        this.batchInterval = setInterval(() => {
            this.sendDrawingBatch();
        }, this.batchRate);
    }

    sendDrawingBatch() {
        if (this.drawingBatch.length === 0) {
            return;
        }
        
        // Send batch of drawing points
        if (window.commentatorSender && !window.isViewerMode) {
            window.commentatorSender.sendCommand({
                action: 'draw-batch',
                points: [...this.drawingBatch], // Copy the array
                tool: 'PEN',
                color: this.getPenColor(),
                timestamp: Date.now()
            });
            
            debug.log(`🎨 Sent drawing batch with ${this.drawingBatch.length} points`);
        }
        
        // Clear the batch
        this.drawingBatch = [];
    }

    handleMouseMove(e) {
        const [x, y] = this.getCanvasCoords(e.offsetX, e.offsetY);
        
        // Always update cursor position for tracking (same as main canvas)
        if (window.overlay) {
            window.overlay.currentMouseX = x;
            window.overlay.currentMouseY = y;
            
            // Also ensure the cursor tracking interval is running
            if (!window.overlay.cursorSendInterval && window.commentatorSender && !window.isViewerMode) {
                // Track last sent coordinates to avoid duplicates
                window.overlay.lastSentX = undefined;
                window.overlay.lastSentY = undefined;
                
                window.overlay.cursorSendInterval = setInterval(() => {
                    if (window.overlay.currentMouseX !== undefined && window.overlay.currentMouseY !== undefined) {
                        // Only send if coordinates have changed
                        if (window.overlay.currentMouseX !== window.overlay.lastSentX || window.overlay.currentMouseY !== window.overlay.lastSentY) {
                        window.commentatorSender.sendCommand({
                            action: 'cursor-move',
                            x: window.overlay.currentMouseX,
                            y: window.overlay.currentMouseY,
                            timestamp: Date.now()
                        });
                            window.overlay.lastSentX = window.overlay.currentMouseX;
                            window.overlay.lastSentY = window.overlay.currentMouseY;
                        }
                    }
                }, 50); // Exactly 20 times per second
            }
        }
        
        // Handle drawing if pen tool is active and drawing
        this.draw(e);
    }
    
    draw(e) {
        if (!this.isDrawing || window.currentTool !== 'PEN') return;
        const [x, y] = this.getCanvasCoords(e.offsetX, e.offsetY);
        if (this.currentPath) {
            this.currentPath.points.push([x, y]);
        }
        this.context.lineTo(x, y);
        this.context.strokeStyle = this.getPenColor();
        this.context.stroke();
        
        // Add point to batch instead of sending immediately
        this.drawingBatch.push([x, y]);
        
        // If batch is getting too large, send it immediately
        if (this.drawingBatch.length >= this.maxBatchSize) {
            this.sendDrawingBatch();
        }
    }

    stopDrawing() {
        if (this.isDrawing && this.currentPath) {
            this.paths.push(this.currentPath);
            this.currentPath = null;
            
            // Send any remaining points in the batch
            this.sendDrawingBatch();
            
            // Stop the batching interval
            if (this.batchInterval) {
                clearInterval(this.batchInterval);
                this.batchInterval = null;
            }
            
            // Send end command
            if (window.commentatorSender && !window.isViewerMode) {
                window.commentatorSender.sendDrawing('end', 0, 0, 'PEN');
            }
        }
        this.isDrawing = false;
    }

    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.marks = [];
        this.paths = [];
        this.currentPath = null;
        
        // Clean up batch system
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
        }
        this.drawingBatch = [];
        
        // Send to viewer if commentator sender is available
        if (window.commentatorSender && !window.isViewerMode) {
            window.commentatorSender.sendClear();
        }
    }

    // Cleanup method for when the drawing layer is destroyed
    destroy() {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
            this.batchInterval = null;
        }
        this.drawingBatch = [];
    }

    addMark(type, x, y, text = '') {
        const mark = { type, x, y, text };
        this.marks.push(mark);
        this.drawMark(mark);
    }

    redrawAll() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Redraw all paths
        this.paths.forEach(path => {
            if (path.points.length > 0) {
                this.context.beginPath();
                this.context.strokeStyle = path.color || this.getPenColor();
                this.context.moveTo(path.points[0][0], path.points[0][1]);
                path.points.slice(1).forEach(point => {
                    this.context.lineTo(point[0], point[1]);
                });
                this.context.stroke();
            }
        });
        // Redraw all marks
        this.marks.forEach(mark => this.drawMark(mark));
    }

    drawMark({ type, x, y, text }) {
        const colorInput = document.getElementById('markupColor');
        const fillColor = colorInput ? colorInput.value : 'white';
        this.context.save();
        this.context.strokeStyle = 'black'; // Default outline
        this.context.fillStyle = fillColor;
        this.context.lineWidth = 2;

        switch (type) {
            case 'TRIANGLE':
                this.drawTriangle(x, y);
                break;
            case 'CIRCLE':
                this.drawCircle(x, y);
                break;
            case 'SQUARE':
                this.drawSquare(x, y);
                break;
            case 'LETTER': {
                // Always use white fill and black outline for letters
                this.context.strokeStyle = 'black';
                this.context.fillStyle = 'white';
                this.context.lineWidth = 3;
                this.context.strokeText(text, x - 8, y + 8);
                this.context.fillText(text, x - 8, y + 8);
                break;
            }
        }

        this.context.restore();
    }

    drawTriangle(x, y) {
        const size = 20;
        this.context.beginPath();
        this.context.moveTo(x, y - size);
        this.context.lineTo(x + size, y + size);
        this.context.lineTo(x - size, y + size);
        this.context.closePath();
        this.context.stroke();
    }

    drawCircle(x, y) {
        const radius = 15;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.stroke();
    }

    drawSquare(x, y) {
        const size = 20;
        this.context.strokeRect(x - size/2, y - size/2, size, size);
    }

    getCanvasCoords(offsetX, offsetY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return [offsetX * scaleX, offsetY * scaleY];
    }
    
    handleMouseEnter(e) {
        // Restart cursor tracking when mouse enters drawing layer
        if (!window.overlay.cursorSendInterval && window.commentatorSender && !window.isViewerMode) {
            // Reset last sent coordinates when re-entering
            window.overlay.lastSentX = undefined;
            window.overlay.lastSentY = undefined;
            
            window.overlay.cursorSendInterval = setInterval(() => {
                if (window.overlay.currentMouseX !== undefined && window.overlay.currentMouseY !== undefined) {
                    // Only send if coordinates have changed
                    if (window.overlay.currentMouseX !== window.overlay.lastSentX || window.overlay.currentMouseY !== window.overlay.lastSentY) {
                    window.commentatorSender.sendCommand({
                        action: 'cursor-move',
                        x: window.overlay.currentMouseX,
                        y: window.overlay.currentMouseY,
                        timestamp: Date.now()
                    });
                        window.overlay.lastSentX = window.overlay.currentMouseX;
                        window.overlay.lastSentY = window.overlay.currentMouseY;
                    }
                }
            }, 50); // Exactly 20 times per second
        }
    }
    
    handleMouseLeave(e) {
        // Stop cursor tracking when mouse leaves drawing layer
        if (window.overlay && window.overlay.cursorSendInterval) {
            clearInterval(window.overlay.cursorSendInterval);
            window.overlay.cursorSendInterval = null;
        }
        if (window.overlay) {
            window.overlay.currentMouseX = undefined;
            window.overlay.currentMouseY = undefined;
        }
    }
    
    // Methods for viewer to replicate drawing actions
    startDrawingAt(x, y, tool) {
        this.isDrawing = true;
        this.currentPath = {
            points: [[x, y]],
            type: 'path',
            color: this.getPenColor()
        };
        this.context.beginPath();
        this.context.strokeStyle = this.getPenColor();
        this.context.moveTo(x, y);
    }
    
    drawTo(x, y) {
        if (!this.isDrawing) return;
        if (this.currentPath) {
            this.currentPath.points.push([x, y]);
        }
        this.context.lineTo(x, y);
        this.context.strokeStyle = this.getPenColor();
        this.context.stroke();
    }
    
    endDrawing() {
        if (this.isDrawing && this.currentPath) {
            this.paths.push(this.currentPath);
            this.currentPath = null;
        }
        this.isDrawing = false;
    }
} 