// models.js

export class Agent {
  constructor({ name, profile, team = [], sentMessages = [], inbox = [], clearance = 1, profilePic = '', bio = '', location = null }) {
    this.name = name;
    this.profile = profile;
    this.team = team;
    this.sentMessages = sentMessages;
    this.inbox = inbox;
    this.clearance = clearance;
    this.profilePic = profilePic;
    this.bio = bio;
    this.location = location; // Expected format: { lat: number, lng: number } or similar
  }

  sendMessage(message, recipient) {
    this.sentMessages.push(message);
    recipient.receiveMessage(message);
  }

  receiveMessage(message) {
    this.inbox.push(message);
  }

  addTeammate(agent) {
    if (!this.team.includes(agent)) {
      this.team.push(agent);
    }
  }
}

export class Message {
  constructor({ content, sender, recipient, timestamp = new Date() }) {
    this.content = content;
    this.sender = sender;
    this.recipi