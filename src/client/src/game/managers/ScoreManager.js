import { reactive } from "vue";

export class ScoreManager {
  constructor() {
    this.state = reactive({
      score: 0,
    });
  }

  addScore(amount) {
    if (this.state.score < 0) {
      this.state.score = 0;
    }

    this.state.score += amount;
  }

  getScore() {
    return this.state.score;
  }

  resetScore() {
    this.state.score = 0;
  }
}
