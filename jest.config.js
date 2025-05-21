module.exports = {
	moduleFileExtensions: ['js', 'json', 'ts'],
	rootDir: '.',
	testRegex: '.int-spec.ts$',
	transform: {
		'^.+\\.(t|j)s$': 'ts-jest',
	},
	collectCoverageFrom: ['**/*.(t|j)s'],
	coverageDirectory: './coverage',
	testEnvironment: 'node',
	roots: ['<rootDir>/src/', '<rootDir>/test/'],
	moduleNameMapper: {
		'^src/(.*)$': '<rootDir>/src/$1',
	},
}; 