import { debug } from '../utils/debugger.js';

export class IframeManager {
    constructor() {
        this.iframes = {
            feed: document.getElementById("feed"),
            obs: document.getElementById("obs"),
            chat: document.getElementById("chat")
        };
        this.vdoNinjaBase = "https://vdo.ninja/?";
        this.parseUrlParams();
        if (window.updateSidePanelVisibility) {
            window.updateSidePanelVisibility();
        }
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        // Handle VDO.Ninja view link
        if (params.has('vdo_link')) {
            const vdoLink = params.get('vdo_link');
            if (vdoLink) {
                this.setUrl('feed', vdoLink);
                document.title = vdoLink;
            }
        }
        // Handle chat URL
        if (params.has('chat_url')) {
            const chatUrl = decodeURIComponent(params.get('chat_url'));
            document.getElementById('ChatUrl').value = chatUrl;
            this.setUrl('chat', chatUrl);
        }
        // Handle commentator view
        if (params.has('commentator') && params.get('commentator') === 'true') {
            if (params.has('room')) {
                this.setCommentatorUrl(params.get('room'));
            }
        }
        // Handle VDO Ninja link
        const vdoLink = params.get('vdo');
        if (vdoLink) {
            let decodedVdoLink = decodeURIComponent(vdoLink);
            // If still contains % signs, decode again
            if (decodedVdoLink.includes('%')) {
                decodedVdoLink = decodeURIComponent(decodedVdoLink);
            }
            document.getElementById('VideoURL').value = decodedVdoLink;
            document.getElementById('feed').src = decodedVdoLink;
        }
    }

    setVdoNinjaUrl(element, params) {
        const url = new URLSearchParams(params).toString();
        this.setUrl(element, url);
    }

    setUrl(type, url) {
        if (this.iframes[type]) {
            this.iframes[type].src = url;
            if (window.updateSidePanelVisibility) {
                window.updateSidePanelVisibility();
            }
        }
    }

    setDataChannelUrl(obsUrl) {
        // Extract room name from OBS URL and recreate data channel
        if (obsUrl && window.commentatorSender) {
            const obsParams = new URLSearchParams(obsUrl.split('?')[1] || '');
            const roomName = obsParams.get('view') || obsParams.get('push');
            
            if (roomName) {
                debug.log('📡 Recreating data channel for new OBS room:', roomName);
                
                // Disable old connection
                window.commentatorSender.disable();
                
                // Wait a moment then enable new connection
                setTimeout(() => {
                    window.commentatorSender.enable(roomName);
                    debug.log('📡 Data channel recreated and enabled for OBS room:', roomName);
                }, 500);
            }
        }
    }

    setViewerUrl(roomId) {
        this.setVdoNinjaUrl('feed', {
            view: roomId,
            autoplay: '1',
            controls: '0',
            mute: '1',
            noaudio: ''
        });
    }

    setCommentatorUrl(roomId) {
        // Special commentator URL with additional features
        this.setVdoNinjaUrl('obs', {
            room: roomId,
            director: '1',
            scene: '1',
            bitrate: '8000',
            quality: '2',
            stereo: '1',
            codec: 'h264',
            label: 'Commentator View',
            cleanoutput: '1',
            broadcast: '1'
        });

        // Set up a broadcast view for the feed as well
        this.setVdoNinjaUrl('feed', {
            view: roomId,
            scene: '1',
            cleanish: '1',
            noaudio: '1',
            muted: '1',
            autoplay: '1'
        });
    }

    generateShareableUrl() {
        const params = new URLSearchParams();
        const vdoLink = document.getElementById('VideoURL').value;
        if (vdoLink) params.append('vdo_link', encodeURIComponent(vdoLink));
        const chatUrl = document.getElementById('ChatUrl').value;
        if (chatUrl) params.append('chat_url', encodeURIComponent(chatUrl));
        // ... add other params as needed ...
        if (window.overlay && window.overlay.points && window.overlay.points.length === 4) {
            params.set('grid', window.overlay.points.map(pt => pt.map(Number).map(n => Math.round(n)).join(',')).join(';'));
        }
        // Add obs_ws param last
        const obsWebSocket = document.getElementById('ObsWebSocket').value;
        if (obsWebSocket) {
            // Use the original WebSocket URL without modification
            let formattedUrl = obsWebSocket;
            
            // Only add scenes parameter if we're in restricted control mode
            if (window.obsController && window.obsController.allowedScenes && window.obsController.allowedScenes.length > 0) {
                // Add scenes parameter for restricted control
                debug.log('Adding scenes parameter to shareable URL (restricted control):', window.obsController.allowedScenes);
                formattedUrl += `&scenes=${encodeURIComponent(JSON.stringify(window.obsController.allowedScenes))}`;
            } else {
                debug.log('No scenes parameter added to shareable URL (full control mode)');
            }
            
            // Note: We don't include the password in the shareable URL for security
            // The password should be entered manually by the user
            
            params.set('obs_ws', encodeURIComponent(encodeURIComponent(formattedUrl)));
        }
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }
} 