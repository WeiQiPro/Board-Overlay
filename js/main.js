import { debug } from './utils/debugger.js';
import { CONST, STONES } from './constants.js';
import { DrawingLayer } from './canvas/drawing-layer.js';
import { Canvas, currentTool, setCurrentTool } from './canvas/canvas.js';
import { IframeManager } from './managers/iframe-manager.js';
import { UIManager } from './managers/ui-manager.js';
import { Video } from './media/video.js';
import { ConfigManager } from './managers/config-manager.js';
import { OBSController } from './obs/obs-controller.js';
import { ViewerController } from './viewer/viewer-controller.js';
import { CommentatorSender } from './viewer/commentator-sender.js';

// Global variables
let isEventSet = false;
let overlay = null;
let drawingLayer = null;

// URL management functions (simplified for now)
function updateShareableUrl() {
    // Set a flag to prevent loadConfigFromUrl from being called during URL updates
    window._updatingUrl = true;
    
    const params = new URLSearchParams();

    // Only chat_url param for chat
    const chatUrl = document.getElementById('ChatUrl')?.value;
    if (chatUrl) params.set('chat_url', encodeURIComponent(chatUrl));

    if (window.overlay && window.overlay.points && window.overlay.points.length === 4) {
        params.set('grid', window.overlay.points.map(pt => pt.map(Number).map(n => Math.round(n)).join(',')).join(';'));
    }

    // Add vdo param last
    const vdoLink = document.getElementById('VideoURL')?.value;
    if (vdoLink) {
        params.set('vdo', encodeURIComponent(encodeURIComponent(vdoLink)));
    }
    // Add obs param last
    const obsLink = document.getElementById('ObsVdoUrl')?.value;
    if (obsLink) {
        params.set('obs', encodeURIComponent(encodeURIComponent(obsLink)));
    }
    
    // Add coordinate color param
    const coordColor = document.getElementById('coordinateColor')?.value;
    if (coordColor) {
        params.set('coord_color', coordColor);
    }
    // Note: OBS control is now handled through VDO Ninja iframe postMessage system
    let url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', url);
    
    // Regenerate viewer URL when input fields change
    if (!window.isViewerMode) {
        window.currentViewerUrl = generateViewerUrl();
    }
    
    // Clear the flag after a short delay to allow normal URL loading
    setTimeout(() => {
        window._updatingUrl = false;
    }, 100);
}

function loadConfigFromUrl() {
    // Skip loading if we're currently updating the URL
    if (window._updatingUrl) {
        debug.log('Skipping loadConfigFromUrl - URL is being updated');
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    debug.log("loadConfigFromUrl called with params:", params);
    
    // Check for viewer mode
    const viewerMode = params.get('viewer');
    if (viewerMode) {
        debug.log('🎥 Viewer mode enabled for session:', viewerMode);
        window.isViewerMode = true;
        window.viewerSessionId = viewerMode;
        setupViewerMode();
        // Continue with config loading to get VDO link and grid setup
    }

    // VDO Ninja link (double decode)
    const vdoLink = params.get('vdo');
    if (vdoLink) {
        let decodedVdoLink = decodeURIComponent(vdoLink);
        if (decodedVdoLink.includes('%')) {
            decodedVdoLink = decodeURIComponent(decodedVdoLink);
        }
        const videoUrlInput = document.getElementById('VideoURL');
        const feedElement = document.getElementById('feed');
        if (videoUrlInput) videoUrlInput.value = decodedVdoLink;
        if (feedElement) feedElement.src = decodedVdoLink;
    }

    // OBS VDO Ninja link (double decode)
    const obsLink = params.get('obs');
    if (obsLink) {
        let decodedObsLink = decodeURIComponent(obsLink);
        if (decodedObsLink.includes('%')) {
            decodedObsLink = decodeURIComponent(decodedObsLink);
        }
        
        // Don't modify the host OBS URL - leave it as is
        
        const obsVdoUrlInput = document.getElementById('ObsVdoUrl');
        const obsElement = document.getElementById('obs');
        if (obsVdoUrlInput) obsVdoUrlInput.value = decodedObsLink;
        if (obsElement) obsElement.src = decodedObsLink;
    }

    // Chat URL
    const chatUrl = params.get('chat_url');
    if (chatUrl) {
        const decodedChatUrl = decodeURIComponent(chatUrl);
        const chatUrlInput = document.getElementById('ChatUrl');
        const chatElement = document.getElementById('chat');
        if (chatUrlInput) chatUrlInput.value = decodedChatUrl;
        if (chatElement) chatElement.src = decodedChatUrl;
    }

    // Stone size
    const stoneSize = params.get('stone');
    if (stoneSize) {
        const stoneSizeInput = document.getElementById('StoneSize');
        if (stoneSizeInput) stoneSizeInput.value = stoneSize;
    }

    // Coordinate color
    const coordColor = params.get('coord_color');
    if (coordColor) {
        const coordColorInput = document.getElementById('coordinateColor');
        if (coordColorInput) coordColorInput.value = coordColor;
    }

    // Grid corners
    const grid = params.get('grid');
    if (grid && window.overlay) {
        window.overlay.points = grid.split(';').map(pt => pt.split(',').map(Number));
        if (window.overlay.points.length === 4) {
            window.overlay.grid = window.overlay.generateGrid(window.overlay.points);
            window.overlay.isGridSet = true;
        }
    }

    // Set grid to show for 3 seconds, then hide
    if (window.overlay) {
        window.overlay.show = true;
        window.overlay.updateGridButtonState();
        setTimeout(() => {
            window.overlay.show = false;
            window.overlay.updateGridButtonState();
        }, 3000);
    } else {
        // If overlay isn't ready yet, set a flag to do this after overlay is created
        window._pendingGridAutoHide = true;
    }

    // Note: OBS WebSocket URL parameters are no longer used since we switched to iframe communication
}

function updateSidePanelVisibility() {
    // Don't show side panel in viewer mode
    if (window.isViewerMode) {
        const sidePanel = document.querySelector('.SidePanel');
        if (sidePanel) sidePanel.style.display = 'none';
        return;
    }
    
    const obsIframe = document.getElementById('obs');
    const chatIframe = document.getElementById('chat');
    const obsControls = document.querySelector('.OBS_Controls');
    const chatDiv = document.querySelector('.Chat');
    const sidePanel = document.querySelector('.SidePanel');
    let obsVisible = !!(obsIframe && obsIframe.src && obsIframe.src.trim());
    let chatVisible = !!(chatIframe && chatIframe.src && chatIframe.src.trim());
    if (obsControls) obsControls.style.display = obsVisible ? '' : 'none';
    if (chatDiv) chatDiv.style.display = chatVisible ? '' : 'none';
    if (sidePanel) sidePanel.style.display = (obsVisible || chatVisible) ? '' : 'none';
}

function setupViewerMode() {
    debug.log('🎥 Setting up viewer mode');
    
    // Add viewer-mode class to body for CSS styling
    document.body.classList.add('viewer-mode');
    
    // Set everything transparent for OBS
    document.body.style.backgroundColor = 'transparent';
    document.body.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    document.documentElement.style.background = 'transparent';
    
    // Make sure all major containers are transparent
    const containers = [
        '.page-container',
        '.content-area', 
        '.main-feed'
    ];
    
    containers.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.backgroundColor = 'transparent';
            element.style.background = 'transparent';
        }
    });
    
    // Hide all UI elements except the main feed
    const elementsToHide = [
        '.top-bar',
        '.SidePanel',
        '.config-panel',
        '.OBS_Controls',
        '.Chat',
        '.footer'
    ];
    
    elementsToHide.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Keep main feed the same size as host's feed iframe for coordinate alignment
    const mainFeed = document.querySelector('.main-feed');
    if (mainFeed) {
        // Don't change size - keep it exactly as it would be on host
        mainFeed.style.backgroundColor = 'transparent';
        mainFeed.style.background = 'transparent';
    }
    
    // Hide the video feed iframe but keep it for dimensions
    const feedIframe = document.getElementById('feed');
    if (feedIframe) {
        feedIframe.style.opacity = '0';
        feedIframe.style.pointerEvents = 'none';
    }
    
    // Add CSS override for complete transparency
    const style = document.createElement('style');
    style.textContent = `
        * {
            background: transparent !important;
            background-color: transparent !important;
        }
        html, body, .page-container, .content-area, .main-feed {
            background: transparent !important;
            background-color: transparent !important;
        }
    `;
    document.head.appendChild(style);
    
    debug.log('🎥 Viewer mode UI setup complete');
}

function generateViewerUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    
    // Create viewer URL with viewer=yes parameter
    const viewerUrl = new URL(baseUrl);
    viewerUrl.searchParams.set('viewer', 'yes');
    
    // Get the OBS URL from input field and create clean viewer URL
    const obsUrlInput = document.getElementById('ObsVdoUrl');
    if (obsUrlInput && obsUrlInput.value.trim()) {
        let obsLink = obsUrlInput.value.trim();
        
        // Extract room name from OBS URL
        const obsParams = new URLSearchParams(obsLink.split('?')[1] || '');
        const roomName = obsParams.get('push') || obsParams.get('view');
        
        if (roomName) {
            // Create clean viewer URL with ONLY view=roomname&dataonly
            const cleanViewerUrl = `https://vdo.ninja/?view=${roomName}&dataonly`;
            viewerUrl.searchParams.set('obs', encodeURIComponent(encodeURIComponent(cleanViewerUrl)));
        }
    }
    
    // Add coordinate color to viewer URL
    const coordColorInput = document.getElementById('coordinateColor');
    if (coordColorInput && coordColorInput.value) {
        viewerUrl.searchParams.set('coord_color', coordColorInput.value);
    }
    
    debug.log('Generated viewer URL:', viewerUrl.toString());
    return viewerUrl.toString();
}

function main() {
    // Make functions globally accessible
    window.updateShareableUrl = updateShareableUrl;
    window.loadConfigFromUrl = loadConfigFromUrl;
    window.updateSidePanelVisibility = updateSidePanelVisibility;
    window.generateViewerUrl = generateViewerUrl;
    
    // Make currentTool globally accessible for drawing layer
    window.currentTool = currentTool;
    window.setCurrentTool = setCurrentTool;
    
    window.onload = () => {
        // 1. Create overlay and drawingLayer first!
        if (!isEventSet) {
            overlay = new Canvas("overlay");
            drawingLayer = new DrawingLayer("drawingLayer");
            
            // Make them globally accessible
            window.overlay = overlay;
            window.drawingLayer = drawingLayer;
            
            // Initialize global currentTool
            window.currentTool = currentTool;
            
            isEventSet = true;
        }

        // 2. Now load config from URL (overlay is defined)
        loadConfigFromUrl();
        
        // 2.5. Update canvas dimensions after viewer mode is determined
        if (overlay && overlay.updateCanvasDimensions) {
            overlay.updateCanvasDimensions();
        }
        if (drawingLayer && drawingLayer.updateCanvasDimensions) {
            drawingLayer.updateCanvasDimensions();
        }

        // 3. If grid auto-hide was pending, do it now
        if (window._pendingGridAutoHide && !window.isViewerMode) {
            overlay.show = true;
            overlay.updateGridButtonState();
            setTimeout(() => {
                overlay.show = false;
                overlay.updateGridButtonState();
            }, 3000);
            window._pendingGridAutoHide = false;
        }

        // 4. Set up controllers based on mode
        if (window.isViewerMode) {
            // Enable debugging in viewer mode
            if (window.debugger) {
                window.debugger.enabled = true;
            }
            
            // Viewer mode - setup viewer controller (it handles its own message listening)
            const viewerController = new ViewerController();
            window.viewerController = viewerController;
            
            debug.log('🎥 Viewer mode initialized');
        } else {
            // Normal mode - set up UIManager, IframeManager, etc.
            const iframeManager = new IframeManager();
            const uiManager = new UIManager(iframeManager);
            const obsController = new OBSController();
            const commentatorSender = new CommentatorSender();
            
            // Make controllers globally accessible
            window.obsController = obsController;
            window.commentatorSender = commentatorSender;
            window.iframeManager = iframeManager;
            
            // Now that commentator sender is available, process OBS URL if it was loaded from parameters
            const params = new URLSearchParams(window.location.search);
            let obsUrl = params.get('obs');
            if (obsUrl) {
                obsUrl = decodeURIComponent(obsUrl);
                if (obsUrl.includes('%')) {
                    obsUrl = decodeURIComponent(obsUrl);
                }
                
                // Extract room name from OBS URL (look for view= or push= parameter)
                const obsParams = new URLSearchParams(obsUrl.split('?')[1] || '');
                const roomName = obsParams.get('view') || obsParams.get('push');
                
                if (roomName) {
                    commentatorSender.enable(roomName);
                    debug.log('📡 Data channel communication enabled for OBS room:', roomName);
                } else {
                    debug.error('❌ Could not extract room name from OBS Camera URL');
                }
            } else {
                debug.error('❌ No OBS Camera URL found - cannot establish data channel communication');
            }
            
            // Generate initial viewer URL
            window.currentViewerUrl = generateViewerUrl();
            
            // Set up copy viewer URL button
            const copyViewerUrlBtn = document.getElementById('copyViewerUrl');
            debug.log('🔍 Found copy viewer URL button:', !!copyViewerUrlBtn);
            debug.log('🔍 Current viewer URL:', window.currentViewerUrl);
            
            if (copyViewerUrlBtn) {
                copyViewerUrlBtn.addEventListener('click', () => {
                    debug.log('🖱️ Copy viewer URL button clicked');
                    debug.log('🔗 Viewer URL to copy:', window.currentViewerUrl);
                    
                    if (window.currentViewerUrl) {
                        navigator.clipboard.writeText(window.currentViewerUrl).then(() => {
                            debug.log('📋 Viewer URL copied to clipboard:', window.currentViewerUrl);
                            copyViewerUrlBtn.textContent = 'Copied!';
                            setTimeout(() => {
                                copyViewerUrlBtn.textContent = 'Copy Viewer URL';
                            }, 2000);
                        }).catch(err => {
                            debug.error('❌ Failed to copy to clipboard:', err);
                            // Fallback - show the URL in an alert
                            alert('Viewer URL: ' + window.currentViewerUrl);
                        });
                    } else {
                        debug.error('❌ No viewer URL available to copy');
                        alert('No viewer URL generated yet');
                    }
                });
            } else {
                debug.error('❌ Copy viewer URL button not found');
            }
        }
        
        // Request initial status after a short delay (only in commentator mode)
        if (!window.isViewerMode) {
            setTimeout(() => {
                if (window.obsController && window.obsController.requestStatus) {
                    window.obsController.requestStatus();
                }
            }, 2000);
        }

        // 5. Set up keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in any input field
            const activeElement = document.activeElement;
            
            // Check if we're in any kind of input field
            const isInputField = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.tagName === 'SELECT' ||
                activeElement.contentEditable === 'true' ||
                activeElement.contentEditable === 'plaintext-only' ||
                activeElement.role === 'textbox' ||
                activeElement.role === 'searchbox' ||
                activeElement.role === 'combobox'
            );
            
            if (isInputField) {
                debug.log('BLOCKING shortcut - user is typing in input field');
                return; // Don't trigger shortcuts when typing in inputs
            }
            
            // Check if we're focused on the canvas/overlay or main feed area
            const mainFeedGroup = document.querySelector('.main-feed');
            const overlayCanvas = document.getElementById('overlay');
            const drawingLayerCanvas = document.getElementById('drawingLayer');
            
            const isCanvasFocused = activeElement === overlayCanvas || 
                                   activeElement === drawingLayerCanvas ||
                                   (mainFeedGroup && mainFeedGroup.contains(activeElement)) ||
                                   activeElement === document.body ||
                                   !activeElement; // Allow when no specific element is focused
            
            if (!isCanvasFocused) {
                debug.log('BLOCKING shortcut - not focused on canvas area');
                return; // Don't trigger shortcuts when not focused on canvas/overlay
            }
            
            // Handle specific shortcuts
            if (e.key === 's' || e.key === 'S') {
                debug.log('Toggling grid visibility with S key');
                e.preventDefault();
                if (window.overlay) {
                    window.overlay.show = !window.overlay.show;
                    window.overlay.updateGridButtonState();
                }
            } else if (e.key === 'r' || e.key === 'R') {
                debug.log('Resetting grid with R key');
                e.preventDefault();
                if (window.overlay) {
                    window.overlay.resetGrid();
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                debug.log('Clearing drawing only with Delete key');
                e.preventDefault();
                // Clear only the drawing layer
                if (window.drawingLayer) {
                    window.drawingLayer.clearCanvas();
                }
                // Send clear drawing command to viewer
                if (window.commentatorSender && !window.isViewerMode) {
                    window.commentatorSender.sendClearDrawing();
                }
            } else if (e.key === ' ' || e.code === 'Space') {
                debug.log('Clearing stones and drawing with spacebar');
                e.preventDefault();
                if (window.overlay) {
                    window.overlay.clearStones();
                }
                // Also clear the drawing layer
                if (window.drawingLayer) {
                    window.drawingLayer.clearCanvas();
                }
                // Send clear all command to viewer
                if (window.commentatorSender && !window.isViewerMode) {
                    window.commentatorSender.sendClearAll();
                }
            }
        });

        // 6. Start animation loop
        let overlayLoop = () => {
            requestAnimationFrame(overlayLoop);
            overlay.tick();
        };
        overlayLoop();
        updateSidePanelVisibility();
    };
}

// Initialize the application
main(); 