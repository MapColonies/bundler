module.exports = {
    transform: {
        "^.+\\.ts$": "ts-jest"
    },
    testMatch: ['<rootDir>/tests/unit/**/*.spec.ts'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: true,
    coverageReporters: ['text', 'html'],
    reporters: [
        'default',
        ['jest-html-reporters', { multipleReportsUnitePath: './reports', pageTitle: 'unit', publicPath: './reports', filename: 'unit.html' }],
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: -10,
        },
    },
};