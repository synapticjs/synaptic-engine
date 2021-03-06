var synaptic = process.env.NODE_ENV == 'node' ? require('../dist/src') : require('../dist/synaptic');
var printer = require('./printer')

process.env.BACKEND = process.env.BACKEND || 'WASM'


const backend = synaptic.backends[process.env.BACKEND];

console.log('Available backends: ' + Object.keys(synaptic.backends).join(' | '));
console.log('Backend: ', backend ? 'OK' : 'NOT FOUND')

var MersenneTwister = require('mersenne-twister')

console.time('Loading MNIST');
var mnist = require('mnist');
var mnistSet = mnist.set(1000);
console.timeEnd('Loading MNIST');

var generator = new MersenneTwister(100010);

var random = generator.random_excl.bind(generator);

synaptic.Lysergic.RandomGenerator = random;

var lstm = new synaptic.Network({
  layers: [
    new synaptic.layers.Input2D(28, 28),
    new synaptic.layers.Dense(15),
    new synaptic.layers.Dense(10, synaptic.Lysergic.Activations.ActivationTypes.SOFTMAX)
  ]
})

lstm.backend = new backend(lstm.engine)
lstm.engine.random = random;
lstm.learningRate = 0.1;

console.time('Build network')

function log(partialResult, errorSet) {
  console.log('\x1B[?25l\x1Bc');
  console.log(printer.printError(partialResult.error/*, errorSet*/));
}



lstm.build().then(() => {
  console.timeEnd('Build network')
  console.time('MNIST')
  var trainer = new synaptic.Trainer(lstm)

  trainer.train(mnistSet.training, {
    learningRate: 0.11,
    minError: 0.01,
    maxIterations: 1800,
    log,
    costFunction: synaptic.Lysergic.CostTypes.SOFTMAX
    // every: printer.every
  })
    .then(result => {
      console.timeEnd('MNIST')
      if (result.error > 0.001) process.exit(1);
      console.log(result)
    }, e => {
      console.error(e);
      console.error(e.stack);
    });
}, e => {
  console.error(e);
  console.error(e.stack);
})