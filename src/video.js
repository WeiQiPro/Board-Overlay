class Video{
  constructor(source, iframe){
    this.iframe = document.getElementById(iframe)
    this.source = source
    this.push_source_to_element()
  }

  push_source_to_element() {
    if (this.source != undefined && this.source.includes("youtube.com")) {
      this.source = this.source.replace(/(?:watch\?v=|\/watch\?v=)([a-zA-Z0-9_-]{11})/, "/embed/$1");
      if (!this.source.includes(CONST.APPEND.CONTROLS)) {
        this.source += CONST.APPEND.CONTROLS
      }
    } else if (this.source != undefined && this.source.includes("twitch.tv")) {
      let twitchChannelRegex = /twitch\.tv\/(\w+)/;
      let twitchChannelMatch = this.source.match(twitchChannelRegex);
      if (twitchChannelMatch) {
        let channelName = twitchChannelMatch[1];
        this.source = `https://player.twitch.tv/?channel=${channelName}&parent=weiqipro.github.io&muted=true`;
      }
    }


    this.iframe.src = this.source;
    this.iframe.allow = CONST.ALLOW
    this.iframe.muted = CONST.TRUE
    this.iframe.frameborder = CONST.ZERO
    this.iframe.allowfullscreen = CONST.TRUE
    this.iframe.style.border = CONST.NONE
    this.iframe.style.boxShadow = "10px 10px 10px 10px rgba(0, 0, 0, 0.6)";

  }

}
