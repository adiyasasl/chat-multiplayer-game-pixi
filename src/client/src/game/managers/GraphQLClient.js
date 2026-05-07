// GraphQLClient.js — Like a Unity API Service Singleton
class GraphQLClient {
  constructor() {
    this.endpoint = 'http://localhost:4000/graphql';
  }

  async request(query, variables = {}) {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  }

  async createOrFindPlayer(username) {
    const mutation = `
      mutation JoinGame($username: String!) {
        joinGame(username: $username) { id username x y }
      }
    `;
    const data = await this.request(mutation, { username });
    return data.joinGame;
  }

  async getPlayers() {
    const query = `query { getPlayers { id username x y } }`;
    const data = await this.request(query);
    return data.getPlayers;
  }
}

export const gqlClient = new GraphQLClient();