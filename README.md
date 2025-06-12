# Board-Overlay

A modern, web-based board review and broadcast overlay tool with integrated video, chat, and commentator controls.

## Features
- **Board Review Tools:**
  - Place black/white stones, markers, and letters.
  - Adjustable stone size and grid.
  - Spacebar clears all stones/markers.
- **Video Integration:**
  - Add a VDO Ninja room or direct link for the main board feed.
  - Add a separate OBS VDO Ninja link for commentator/screen sharing (in the SidePanel).
- **Chat Integration:**
  - Twitch and YouTube chat support via input or URL param.
  - Chat panel auto-connects if a channel is provided.
  - Each user gets a colored Go stone icon.
- **OBS/Commentator Panel:**
  - Dedicated OBS iframe in the SidePanel for remote commentator control, camera, and screen sharing.
  - Fixed width and adjustable height for the OBS panel; chat shrinks as needed.
- **Shareable URLs:**
  - All settings (room, chat, OBS, stone size, grid) are encoded in the URL for easy sharing and restoring.
- **Permissions:**
  - All iframes (main and OBS) are granted `camera`, `microphone`, and `display-capture` permissions for video, audio, and screen sharing.

## Usage
1. **Set up the main board feed:**
   - Enter your VDO Ninja room or direct link in the "Room" field and click Connect.
2. **Set up the OBS/Commentator feed:**
   - Paste your OBS VDO Ninja link in the "OBS VDO Ninja" field and click Connect.
   - This iframe will have access to camera, mic, and screen sharing.
3. **Enable chat:**
   - Enter a Twitch or YouTube channel and click Set.
   - The chat panel will appear in the SidePanel.
4. **Share your setup:**
   - Click "Copy Share URL" to get a link with all your current settings.
   - Anyone with the link will see the same board, video, OBS, and chat setup.

## Controls
- **Stone Size:** Adjust manually in the input field.
- **Left Click:** Place a black stone.
- **Right Click:** Place a white stone.
- **Spacebar:** Clear all stones and markers.
- **Delete a stone:** Click again with the same color.
- **Change stone color:** Click with the opposite color.

## Permissions
- The app automatically sets the correct iframe permissions for camera, microphone, and screen sharing (display-capture) for both the main and OBS feeds.

## Link
[Board-Overlay Tool](https://weiqipro.github.io/Board-Overlay/)
