import { reactive } from "vue";

export class ScoreManager {
  constructor() {
    this.state = reactive({
      score: 0,
    });
  }

  addScore(amount) {
    this.state.score += amount;
    
    if (this.state.score < 0) {
      this.state.score = 0;
    }
  }

  getScore() {
    return this.state.score;
  }

  resetScore() {
    this.state.score = 0;
  }
}
