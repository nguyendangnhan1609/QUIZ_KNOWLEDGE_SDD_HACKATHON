import { describe, it, expect } from 'vitest';
import { selectQuestions, shuffleAnswerOrder, generateSessionPayload } from './randomization';

describe('randomization', () => {
  describe('selectQuestions', () => {
    it('should select correct number of questions', () => {
      const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const selected = selectQuestions(ids, 5, 'test-seed');
      expect(selected).toHaveLength(5);
    });

    it('should produce consistent results with same seed', () => {
      const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const seed = 'consistent-seed';
      const first = selectQuestions(ids, 5, seed);
      const second = selectQuestions(ids, 5, seed);
      expect(first).toEqual(second);
    });

    it('should produce different results with different seeds', () => {
      const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const first = selectQuestions(ids, 5, 'seed-1');
      const second = selectQuestions(ids, 5, 'seed-2');
      expect(first).not.toEqual(second);
    });

    it('should select all questions when count equals array length', () => {
      const ids = [1, 2, 3, 4, 5];
      const selected = selectQuestions(ids, 5, 'seed');
      expect(selected).toHaveLength(5);
      expect(selected.sort()).toEqual(ids);
    });
  });

  describe('shuffleAnswerOrder', () => {
    it('should produce consistent results with same seed', () => {
      const indices = [0, 1, 2, 3];
      const seed = 'answer-seed';
      const first = shuffleAnswerOrder(indices, seed);
      const second = shuffleAnswerOrder(indices, seed);
      expect(first).toEqual(second);
    });

    it('should shuffle array', () => {
      const indices = [0, 1, 2, 3];
      const shuffled = shuffleAnswerOrder(indices, 'seed-that-shuffles');
      expect(shuffled.sort()).toEqual(indices.sort());
    });

    it('should return different shuffle with different seed', () => {
      const indices = [0, 1, 2, 3];
      const first = shuffleAnswerOrder(indices, 'seed-1');
      const second = shuffleAnswerOrder(indices, 'seed-2');
      expect(first).not.toEqual(second);
    });
  });

  describe('generateSessionPayload', () => {
    it('should create valid payload structure', () => {
      const questionIds = [5, 10, 15];
      const answerOrders = { '5': [1, 0, 3, 2], '10': [2, 1, 0, 3], '15': [0, 2, 1, 3] };
      const seed = 'test-seed';

      const payload = generateSessionPayload(questionIds, answerOrders, seed);

      expect(payload.questionIds).toEqual(questionIds);
      expect(payload.answerOrders).toEqual(answerOrders);
      expect(payload.seed).toBe(seed);
      expect(payload.clientViewOrder).toEqual(questionIds);
    });

    it('should maintain question order in clientViewOrder', () => {
      const questionIds = [8, 3, 15, 1];
      const answerOrders = {};
      const payload = generateSessionPayload(questionIds, answerOrders, 'seed');

      expect(payload.clientViewOrder).toEqual(questionIds);
    });
  });
});
