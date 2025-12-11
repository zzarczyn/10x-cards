/**
 * Faker.js Setup
 * Configuration and helpers for generating test data
 */

import { faker } from "@faker-js/faker";

// Set seed for reproducible test data (optional)
// faker.seed(123);

/**
 * Generate mock user data
 */
export function generateMockUser() {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    password: faker.internet.password({ length: 12 }),
    created_at: faker.date.past().toISOString(),
  };
}

/**
 * Generate mock flashcard data
 */
interface MockFlashcard {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  source: string;
  generation_id: string;
  created_at: string;
  updated_at: string;
}

export function generateMockFlashcard(overrides?: Partial<MockFlashcard>): MockFlashcard {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    question: faker.lorem.sentence(),
    answer: faker.lorem.paragraph(),
    source: faker.helpers.arrayElement(["ai-full", "ai-edited", "manual"]),
    generation_id: faker.string.uuid(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock text content for AI generation
 */
export function generateMockTextContent(paragraphs = 3) {
  return faker.lorem.paragraphs(paragraphs, "\n\n");
}

/**
 * Generate mock generation record
 */
interface MockGeneration {
  id: string;
  user_id: string;
  source_text: string;
  cards_generated: number;
  cards_accepted: number;
  cards_edited: number;
  created_at: string;
}

export function generateMockGeneration(overrides?: Partial<MockGeneration>): MockGeneration {
  return {
    id: faker.string.uuid(),
    user_id: faker.string.uuid(),
    source_text: generateMockTextContent(2),
    cards_generated: faker.number.int({ min: 5, max: 20 }),
    cards_accepted: faker.number.int({ min: 3, max: 15 }),
    cards_edited: faker.number.int({ min: 0, max: 5 }),
    created_at: faker.date.past().toISOString(),
    ...overrides,
  };
}

export { faker };
