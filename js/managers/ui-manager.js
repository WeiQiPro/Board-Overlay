import { debug } from '../utils/debugger.js';

export class UIManager {
    constructor(iframeManager) {
        this.iframeManager = iframeManager;
        this.reviewPanel = document.getElementById('reviewPanel');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.obsControlPanel = document.getElementById('obsControlPanel');
        this.toggleReview = document.getElementById('toggleReview');
        this.toggleSettings = document.getElementById('toggleSettings');
        this.toggleObsControl = document.getElementById('toggleObsControl');
        this.gridElement = document.getElementById('GridElement');
        
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Toggle panels
        if (this.toggleReview) {
            this.toggleReview.addEventListener('click', () => {
                this.togglePanel('review');
            });
        }

        if (this.toggleSettings) {
            this.toggleSettings.addEventListener('click', () => {
                this.togglePanel('settings');
            });
        }

        if (this.toggleObsControl) {
            this.toggleObsControl.addEventListener('click', () => {
                this.togglePanel('obsControl');
            });
        }

        // Grid toggle
        const gridBtn = document.getElementById('GridElement');
        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                window.overlay.show = !window.overlay.show;
                window.overlay.updateGridButtonState();
            });
        }

        // Video connection
        const videoBtn = document.getElementById('VideoButton');
        if (videoBtn) {
            videoBtn.addEventListener('click', () => {
                const vdoLink = document.getElementById('VideoURL').value.trim();
                if (vdoLink) {
                    // Use iframe manager to ensure proper audio settings
                    if (this.iframeManager && this.iframeManager.ensureFeedAudioSettings) {
                        const processedUrl = this.iframeManager.ensureFeedAudioSettings(vdoLink);
                        document.getElementById('feed').src = processedUrl;
                    } else {
                        document.getElementById('feed').src = vdoLink;
                    }
                    if (window.updateShareableUrl) {
                        window.updateShareableUrl();
                    }
                }
            });
        }

        // Stone size
        const stoneSizeInput = document.getElementById('StoneSize');
        if (stoneSizeInput) {
            stoneSizeInput.addEventListener('change', (e) => {
                if (window.overlay) {
                    window.overlay.stones_radius = e.target.value;
                }
            });
        }

        // Reset grid
        this.resetBtn = document.getElementById('ResetGrid');
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                window.overlay.isGridSet = false;
                window.overlay.grid = [];
                window.overlay.points = [];
                window.overlay.stones = [];
                window.overlay.boardStones = [];
                window.overlay.updateGridButtonState();
                if (window.updateShareableUrl) {
                    window.updateShareableUrl();
                }
            });
        }

        // Update shareable URL on input changes and populate iframes
        ['VideoURL', 'StoneSize', 'ObsWebSocket', 'ObsVdoUrl', 'ChatUrl', 'coordinateColor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => {
                // Update URL
                if (window.updateShareableUrl) {
                    window.updateShareableUrl();
                }
                
                // Populate iframes based on input type
                if (id === 'VideoURL') {
                    const vdoLink = el.value.trim();
                    if (vdoLink) {
                        // Use iframe manager to ensure proper audio settings
                        if (this.iframeManager && this.iframeManager.ensureFeedAudioSettings) {
                            const processedUrl = this.iframeManager.ensureFeedAudioSettings(vdoLink);
                            document.getElementById('feed').src = processedUrl;
                        } else {
                            document.getElementById('feed').src = vdoLink;
                        }
                    }
                } else if (id === 'ObsVdoUrl') {
                    const obsLink = el.value.trim();
                    if (obsLink) {
                        document.getElementById('obs').src = obsLink;
                        // Update side panel visibility
                        if (window.updateSidePanelVisibility) {
                            window.updateSidePanelVisibility();
                        }
                        
                        // Recreate data channel iframe with new room name
                        if (this.iframeManager && this.iframeManager.setDataChannelUrl) {
                            this.iframeManager.setDataChannelUrl(obsLink);
                        }
                    }
                } else if (id === 'ChatUrl') {
                    const chatUrl = el.value.trim();
                    if (chatUrl) {
                        document.getElementById('chat').src = chatUrl;
                        // Update side panel visibility
                        if (window.updateSidePanelVisibility) {
                            window.updateSidePanelVisibility();
                        }
                    }
                } else if (id === 'coordinateColor') {
                    // Send coordinate color change to viewer
                    if (window.commentatorSender && !window.isViewerMode) {
                        window.commentatorSender.sendCommand({
                            action: 'coordinate-color',
                            color: el.value,
                            timestamp: Date.now()
                        });
                        debug.log('🎨 Sent coordinate color to viewer:', el.value);
                    }
                }
            });
        });

        // Copy share URL
        const copyBtn = document.getElementById('copyShareUrl');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(window.location.href);
                alert('Shareable URL copied!');
            });
        }
    }

    togglePanel(type) {
        const panels = {
            'review': this.reviewPanel,
            'settings': this.settingsPanel,
            'obsControl': this.obsControlPanel
        };
        const buttons = {
            'review': this.toggleReview,
            'settings': this.toggleSettings,
            'obsControl': this.toggleObsControl
        };

        const targetPanel = panels[type];
        const targetBtn = buttons[type];

        if (targetPanel.classList.contains('hidden')) {
            // Hide all other panels
            Object.values(panels).forEach(panel => {
                if (panel && panel !== targetPanel) {
                    panel.classList.add('hidden');
                }
            });
            Object.values(buttons).forEach(btn => {
                if (btn && btn !== targetBtn) {
                    btn.classList.remove('active');
                }
            });
            
            // Show target panel
            targetPanel.classList.remove('hidden');
            targetBtn.classList.add('active');
        } else {
            // Hide target panel
            targetPanel.classList.add('hidden');
            targetBtn.classList.remove('active');
        }
    }
} 