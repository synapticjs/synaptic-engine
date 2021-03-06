var lstmJSON = require('../__tests__/mocks/lstm.json');

var samplesTimingTask = require('../__tests__/mocks/samples-timing-task');
var LSTMTimingTaskActivationMock = require('../__tests__/mocks/lstm-timing-task-activation');
var LSTMTimingTaskPropagationMock = require('../__tests__/mocks/lstm-timing-task-propagation');
var synaptic = process.env.NODE_ENV == 'node' ? require('../dist') : require('../dist/synaptic');
var lysergic = require('lysergic');

var MersenneTwister = require('mersenne-twister');

var generator = new MersenneTwister(100010);

var random = generator.random_excl.bind(generator);

var mnist = require('mnist')

synaptic.Lysergic.RandomGenerator = random;


const COMPUTED_KEYS = [
  'state',
  'weight',
  'gain',
  'activation',
  'elegibilityTrace',
  'extendedElegibilityTrace',
  'errorResponsibility',
  'projectedErrorResponsibility',
  'gatedErrorResponsibility'
];

function copy(obj) {
  const copied = {}
  Object.keys(obj)
    .forEach(key => {
      if (typeof obj[key] === 'object') {
        if (obj[key] === null || obj[key] === undefined) {
        } else {
          copied[key] = copy(obj[key])
        }
      } else {
        copied[key] = obj[key]
      }
    })
  return copied
}

function getTitle(key) {
  if (isNaN(Number(key))) {
    return `should compute ${key}`
  } else {
    return `unit ${key}`
  }
}

function isAlmostEqual(description, received, expected, precision, logLevel, level) {
  const log = typeof level === 'undefined' || level <= logLevel
  const spec = () => {
    Object.keys(expected)
      .forEach((key) => {
        if (level || COMPUTED_KEYS.indexOf(key) !== -1) {
          if (typeof received[key] === 'object') {
            isAlmostEqual(key, received[key], expected[key], precision, logLevel, (level | 0) + 1)
          } else {
            const precisionFn = typeof received[key] === 'number' ? 'toBeCloseTo' : 'toBe'
            const testFn = () => expect(received[key])[precisionFn](expected[key], precision)
            log ? test(getTitle(key), testFn) : testFn()
          }
        }
      })
  }
  if (log) {
    describe(!level ? description : getTitle(description), spec)
  } else {
    test(getTitle(description), spec)
  }
}

function getLSTM(Backend) {
  var json = JSON.parse(JSON.stringify(lstmJSON))
  var lstm = synaptic.Network.fromJSON(json)
  lstm.backend = new Backend(lstm.engine)
  lstm.engine.random = random;
  return lstm
}

function testActivationAndPropagation(Backend, precision, logLevel) {
  test('testActivationAndPropagation', () => {
    var lstm = getLSTM(Backend)
    return lstm.build().then(() => {
      lstm.activate(samplesTimingTask.train[0].input)
      isAlmostEqual('Activation', copy(lstm.engine), LSTMTimingTaskActivationMock, precision, logLevel)
      lstm.propagate(samplesTimingTask.train[0].output)
      isAlmostEqual('Propagation', copy(lstm.engine), LSTMTimingTaskPropagationMock, precision, logLevel)
    })
  })
}

function testTimingTask(Backend) {
  describe('Tasks', () => {

    var lstm = getLSTM(Backend)
    var trainer = new synaptic.Trainer(lstm)

    test('should pass Timing Task with an error lower than 0.05 in less than 200 iterations', () => {
      return trainer
        .train(samplesTimingTask.train, {
          learningRate: 0.03,
          minError: 0.05,
          maxIterations: 200
        })
        .then(result => {
          expect(result.error).toBeLessThan(0.05);
          expect(result.iterations).toBeLessThan(200);
        })
    })
  })
}

var mnistSet = mnist.set(1000);

function testMnist(Backend, softmax = true) {
  describe('Tasks mnist softmax=' + softmax, () => {

    var network;

    if (softmax) {
      network = new synaptic.Network(
        new synaptic.layers.Input2D(24, 24),
        new synaptic.layers.Dense(20), //new synaptic.layers.Convolution2D({ filter: 8, depth: 1, stride: 1, padding: 0 }),
        new synaptic.layers.Dense(10),
        new synaptic.layers.SoftMax()
      )
    } else {
      network = new synaptic.Network(
        new synaptic.layers.Input2D(24, 24),
        new synaptic.layers.Dense(20), //new synaptic.layers.Convolution2D({ filter: 8, depth: 1, stride: 1, padding: 0 }),
        new synaptic.layers.Dense(10)
      )
    }

    network.backend = new Backend(network.engine)

    var trainer = new synaptic.Trainer(network)

    test('should pass Timing Task with an error lower than 0.05 in less than 200 iterations', done => {
      try {
        trainer.train(mnistSet.training, {
          learningRate: 0.1,
          minError: 0.0001,
          maxIterations: 10
        })
          .then(result => {
            expect(result.error).toBeLessThan(0.05);
            expect(result.iterations).toBeLessThan(200);
            done()
          }, e => {
            console.error(e);
            console.error(e.stack);
            done(e);
          })
      } catch (e) {
        console.error(e);
        console.error(e.stack);
        done(e);
      }
    })
  })
}


function testSoftMax(Backend) {
  describe('Tasks', () => {
    var network = new synaptic.Network(
      new synaptic.layers.Input(3),
      new synaptic.layers.SoftMax(3)
    )

    network.backend = new Backend(network.engine)

    test('Softmax result must sum 1', () => {
      return network.build().then(() => {
        let result = network.activate([0, 1, 0.5])
        expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
        done()
      }, e => {
        done(e);
      })
    })
  })
}

function testDiscreteSequenceRecallTask(Backend, options) {
  describe('Tasks', () => {
    test('should pass Descrete Sequence Recall Task with at least 80% success rate in less than 100k iterations', () => {
      var lstm = new synaptic.Network(
        new synaptic.layers.Input(6),
        new synaptic.layers.LSTM(7),
        new synaptic.layers.Dense(2)
      )

      lstm.backend = new Backend(lstm.engine)

      return lstm.build().then(() => {
        lstm.engine.random = random;
        lstm.learningRate = 0.1;

        lstm.engine.status = synaptic.Lysergic.StatusTypes.TRAINING

        var targets = [2, 4];
        var distractors = [3, 5];
        var prompts = [0, 1];
        var length = 10;
        var criterion = 0.80;
        var iterations = 100000;
        var rate = .1;
        var schedule = {};
        console.log(synaptic.Lysergic)
        var cost = synaptic.Lysergic.CostTypes.CROSS_ENTROPY;

        var trial, correct, i, j, success;
        trial = correct = i = j = success = 0;
        var error = 1,
          symbols = targets.length + distractors.length + prompts.length;

        var noRepeat = function (range, avoid) {
          var number = random() * range | 0;
          var used = false;
          for (var i in avoid)
            if (number == avoid[i])
              used = true;
          return used ? noRepeat(range, avoid) : number;
        };

        var equal = function (prediction, output) {
          for (var i in prediction)
            if (Math.round(prediction[i]) != output[i])
              return false;
          return true;
        };

        var start = Date.now();

        while (trial < iterations && success < criterion) {
          // generate sequence
          var sequence = [],
            sequenceLength = length - prompts.length;
          for (i = 0; i < sequenceLength; i++) {
            var any = random() * distractors.length | 0;
            sequence.push(distractors[any]);
          }
          var indexes = [],
            positions = [];
          for (i = 0; i < prompts.length; i++) {
            indexes.push(random() * targets.length | 0);
            positions.push(noRepeat(sequenceLength, positions));
          }
          positions = positions.sort();
          for (i = 0; i < prompts.length; i++) {
            sequence[positions[i]] = targets[indexes[i]];
            sequence.push(prompts[i]);
          }

          //train sequence
          var distractorsCorrect;
          var targetsCorrect = distractorsCorrect = 0;
          error = 0;
          for (i = 0; i < length; i++) {
            // generate input from sequence
            var input = [];
            for (j = 0; j < symbols; j++)
              input[j] = 0;
            input[sequence[i]] = 1;

            // generate target output
            var output = [];
            for (j = 0; j < targets.length; j++)
              output[j] = 0;

            if (i >= sequenceLength) {
              var index = i - sequenceLength;
              output[indexes[index]] = 1;
            }

            // check result
            var prediction = lstm.activate(input);

            if (equal(prediction, output))
              if (i < sequenceLength)
                distractorsCorrect++;
              else
                targetsCorrect++;
            else {
              lstm.propagate(output);
            }

            error += synaptic.Lysergic.costFunction(output, prediction, synaptic.Lysergic.CostTypes.CROSS_ENTROPY);

            if (distractorsCorrect + targetsCorrect == length)
              correct++;
          }

          // calculate error
          if (trial % 1000 == 0)
            correct = 0;
          trial++;
          var divideError = trial % 1000;
          divideError = divideError == 0 ? 1000 : divideError;
          success = correct / divideError;
          error /= length;
        }

        lstm.engine.status = synaptic.Lysergic.StatusTypes.IDLE

        var results = {
          iterations: trial,
          success: success,
          error: error,
          time: Date.now() - start
        }

        console.log(results)

        expect(results.success).toBeGreaterThanOrEqual(0.8)
        expect(results.iterations).toBeLessThan(100 * 1000)
        done()
      }, e => {
        done(e)
      })
    })
  })
}

function testBackend(description, Backend, options) {
  describe(description, () => {
    testActivationAndPropagation(Backend, (options && options.precision) || 15, (options && options.logLevel) || 0)
    testSoftMax(Backend)
    testMnist(Backend, false)
    // testMnist(Backend, true)
    testTimingTask(Backend)
    //testDiscreteSequenceRecallTask(Backend);
  })
}

module.exports = testBackend
