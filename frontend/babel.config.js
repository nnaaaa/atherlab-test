module.exports = {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' },
      modules: 'commonjs' 
    }],
    ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
    ['@babel/preset-react', { 
      runtime: 'automatic',
      development: process.env.NODE_ENV === 'development',
      importSource: 'react'
    }]
  ],
}; 