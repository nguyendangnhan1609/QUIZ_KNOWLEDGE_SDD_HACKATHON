import { prisma } from '../src/lib/db/prisma';
import crypto from 'crypto';

async function main() {
  console.log('Seeding database...');

  // Clear existing seed data (safe for repeated runs in dev)
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.quizSubmission.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.document.deleteMany();

  // Create primary demo document
  const primaryDoc = await prisma.document.create({
    data: {
      filename: 'Python Basics Guide.txt',
      mimeType: 'text/plain',
      storagePath: 'docs/python-basics-seed.txt',
      textContent: `Python Basics Guide

Introduction to Python
Python is a high-level, interpreted programming language known for its simplicity and readability.

Variables and Data Types
Variables store data values. Python has several data types: integers, floats, strings, booleans, lists, and dictionaries.

Control Flow
Python uses if/else statements for conditional execution and for/while loops for iteration.

Functions
Functions allow you to organize code into reusable blocks. Functions are defined with the def keyword.

Object-Oriented Programming
Python supports OOP with classes, objects, inheritance, and polymorphism.

Modules and Libraries
Python has a rich ecosystem of modules and libraries for various purposes.`,
      charCount: 850,
    },
  });

  // Create backup demo document
  const backupDoc = await prisma.document.create({
    data: {
      filename: 'Web Development Fundamentals.txt',
      mimeType: 'text/plain',
      storagePath: 'docs/web-dev-seed.txt',
      textContent: `Web Development Fundamentals

HTML Basics
HTML (HyperText Markup Language) is the standard markup language for web pages.

CSS Styling
CSS (Cascading Style Sheets) is used to style HTML elements and control layout.

JavaScript Fundamentals
JavaScript is a scripting language that enables interactive web pages.

Client vs Server
Web applications consist of client-side code running in browsers and server-side code on web servers.

HTTP Protocol
HTTP is the protocol used for transferring web pages and resources over the internet.

Web Frameworks
Frameworks like React, Vue, and Angular simplify web application development.`,
      charCount: 720,
    },
  });

  console.log('✓ Seeded primary document:', primaryDoc.id);
  console.log('✓ Seeded backup document:', backupDoc.id);

  // Create a sample quiz for the primary document
  const sampleQuiz = await prisma.quiz.create({
    data: {
      documentId: primaryDoc.id,
      questionCount: 4,
      publicToken: crypto.randomBytes(16).toString('hex'),
      resultsToken: crypto.randomBytes(16).toString('hex'),
    },
  });

  console.log('✓ Seeded sample quiz:', sampleQuiz.id);

  // Add questions to the quiz
  const questions = [
    {
      text: 'What is the correct way to declare a variable in Python?',
      explanation: 'Python uses direct assignment without variable declaration keywords.',
      difficulty: 'easy',
      options: [
        { text: 'var name = "value"', isCorrect: false },
        { text: 'name = "value"', isCorrect: true },
        { text: 'declare name = "value"', isCorrect: false },
        { text: 'name: "value"', isCorrect: false },
      ],
    },
    {
      text: 'Which keyword is used to define a function in Python?',
      explanation: 'The "def" keyword is used to define functions in Python.',
      difficulty: 'easy',
      options: [
        { text: 'function', isCorrect: false },
        { text: 'func', isCorrect: false },
        { text: 'def', isCorrect: true },
        { text: 'define', isCorrect: false },
      ],
    },
    {
      text: 'What is the output of print(2 ** 3)?',
      explanation: 'The ** operator is the exponentiation operator. 2 ** 3 equals 8.',
      difficulty: 'medium',
      options: [
        { text: '5', isCorrect: false },
        { text: '6', isCorrect: false },
        { text: '8', isCorrect: true },
        { text: '9', isCorrect: false },
      ],
    },
    {
      text: 'Which data structure is ordered and mutable?',
      explanation: 'Lists are ordered (maintain element order) and mutable (can be modified).',
      difficulty: 'medium',
      options: [
        { text: 'Tuple', isCorrect: false },
        { text: 'List', isCorrect: true },
        { text: 'String', isCorrect: false },
        { text: 'Dictionary', isCorrect: false },
      ],
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const question = await prisma.question.create({
      data: {
        quizId: sampleQuiz.id,
        text: q.text,
        explanation: q.explanation,
        difficulty: q.difficulty,
        orderIndex: i,
      },
    });

    await Promise.all(
      q.options.map((opt, idx) =>
        prisma.option.create({
          data: {
            questionId: question.id,
            text: opt.text,
            isCorrect: opt.isCorrect,
            orderIndex: idx,
          },
        })
      )
    );
  }

  console.log('✓ Seeded 4 sample questions with options');

  // Create sample submissions (attempts) with analytics data
  const sampleAttempts = [
    { identifier: 'Alice', correctCount: 4 },
    { identifier: 'Bob', correctCount: 3 },
    { identifier: 'Charlie', correctCount: 2 },
  ];

  for (const attemptData of sampleAttempts) {
    const attempt = await prisma.attempt.create({
      data: {
        quizId: sampleQuiz.id,
        identifier: attemptData.identifier,
        score: attemptData.correctCount,
        totalQuestions: 4,
      },
    });

    // Create sample answers
    const questionsWithOptions = await prisma.question.findMany({
      where: { quizId: sampleQuiz.id },
      include: { options: true },
    });

    for (let i = 0; i < questionsWithOptions.length; i++) {
      const question = questionsWithOptions[i];
      const isCorrect = i < attemptData.correctCount;
      const selectedOption = isCorrect
        ? question.options.find((opt: { isCorrect: boolean }) => opt.isCorrect)
        : question.options.find((opt: { isCorrect: boolean }) => !opt.isCorrect) ||
          question.options[0];

      await prisma.attemptAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          selectedOptionId: selectedOption?.id || null,
          isCorrect: isCorrect,
        },
      });
    }
  }

  console.log('✓ Seeded 3 sample attempts with various scores');
  console.log('\n📊 Demo Data Summary:');
  console.log('  - Documents: 2 (Python Basics, Web Development)');
  console.log('  - Quiz: Python Basics (4 questions)');
  console.log('  - Submissions: 3 (Perfect, 75%, 50%)');
}

main()
  .catch((e) => {
    console.error('✗ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
