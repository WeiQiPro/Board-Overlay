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
    // Note: OBS control is now handled through VDO Ninja iframe postMessage system
    let url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', url);
    
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
    
    // Set green background for chroma keying
    document.body.style.backgroundColor = '#00ff00';
    document.querySelector('.page-container').style.backgroundColor = '#00ff00';
    
    // Hide all UI elements except the main feed
    const elementsToHide = [
        '.top-bar',
        '.SidePanel',
        '.config-panel',
        '.OBS_Controls',
        '.Chat'
    ];
    
    elementsToHide.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // Make main feed full screen but keep aspect ratio for canvas dimensions
    const mainFeed = document.querySelector('.main-feed');
    if (mainFeed) {
        mainFeed.style.position = 'fixed';
        mainFeed.style.top = '0';
        mainFeed.style.left = '0';
        mainFeed.style.width = '100vw';
        mainFeed.style.height = '100vh';
        mainFeed.style.margin = '0';
        mainFeed.style.zIndex = '1000';
    }
    
    // Hide the video feed iframe but keep it for dimensions
    const feedIframe = document.getElementById('feed');
    if (feedIframe) {
        feedIframe.style.opacity = '0';
        feedIframe.style.pointerEvents = 'none';
    }
    
    debug.log('🎥 Viewer mode UI setup complete');
}

function generateViewerUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const currentUrl = new URL(window.location);
    
    // Copy all current parameters except add viewer=yes
    const viewerUrl = new URL(baseUrl);
    
    // Copy existing parameters (grid, vdo, obs, etc.) but modify VDO links
    for (const [key, value] of currentUrl.searchParams) {
        if (key !== 'viewer') { // Don't copy existing viewer param
            if (key === 'vdo') {
                // Modify VDO Ninja links to change push= to view=
                let decodedVdoLink = decodeURIComponent(value);
                if (decodedVdoLink.includes('%')) {
                    decodedVdoLink = decodeURIComponent(decodedVdoLink);
                }
                
                // Replace push= with view= in the VDO link
                const modifiedVdoLink = decodedVdoLink.replace(/push=([^&]+)/, 'view=$1');
                viewerUrl.searchParams.set(key, encodeURIComponent(encodeURIComponent(modifiedVdoLink)));
            } else if (key === 'obs') {
                // For OBS link, simplify to only include view= and &datamode
                let decodedObsLink = decodeURIComponent(value);
                if (decodedObsLink.includes('%')) {
                    decodedObsLink = decodeURIComponent(decodedObsLink);
                }
                
                // Extract the room name from push= or view= parameter
                const obsParams = new URLSearchParams(decodedObsLink.split('?')[1] || '');
                const roomName = obsParams.get('push') || obsParams.get('view');
                
                if (roomName) {
                    // Create simplified OBS URL with only view= parameter
                    const baseObsUrl = decodedObsLink.split('?')[0] || 'https://vdo.ninja/';
                    const simplifiedObsLink = `${baseObsUrl}?view=${roomName}`;
                    viewerUrl.searchParams.set(key, encodeURIComponent(encodeURIComponent(simplifiedObsLink)));
                } else {
                    // Fallback to original if we can't extract room name
                    viewerUrl.searchParams.set(key, value);
                }
            } else {
                viewerUrl.searchParams.set(key, value);
            }
        }
    }
    
    // Add viewer=yes parameter
    viewerUrl.searchParams.set('viewer', 'yes');
    
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
            
            // Generate initial viewer URL and automatically enable broadcasting
            window.currentViewerUrl = generateViewerUrl();
            
            // Extract room name from OBS URL for broadcasting
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
                    debug.log('📡 Viewer broadcasting enabled for room:', roomName);
                } else {
                    debug.error('❌ Could not extract room name from OBS URL');
                }
            } else {
                debug.error('❌ No OBS URL found for broadcasting');
            }
            
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
                // Send clear command to viewer (only once)
                if (window.commentatorSender && !window.isViewerMode) {
                    window.commentatorSender.sendClear();
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