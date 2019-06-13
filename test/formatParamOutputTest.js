const chai = require('chai');

const { expect } = chai;
const { formatParamOutput } = require('../src/koa_validator').utils;

describe('#formatParamOutput()', () => {
  it('should correct return formatted string if all elements in array are strings', () => {
    expect(formatParamOutput(['hey', 'yo', 'hello'])).to.equal('hey.yo.hello');
  });

  it('should return a string with integers in brackets', () => {
    expect(formatParamOutput(['hey', 'yo', '0', 'hello'])).to.equal(
      'hey.yo[0].hello',
    );
    expect(formatParamOutput(['hey', 'yo', 0, 'hello'])).to.equal(
      'hey.yo[0].hello',
    );
    expect(formatParamOutput(['hey', 'yo', 0, 0, 'hello'])).to.equal(
      'hey.yo[0][0].hello',
    );
    expect(formatParamOutput(['hey', 'yo', 2342342, 'hello'])).to.equal(
      'hey.yo[2342342].hello',
    );
    expect(formatParamOutput(['hey', 'yo', '2342342', 'hello'])).to.equal(
      'hey.yo[2342342].hello',
    );
    expect(
      formatParamOutput(['hey', 'yo', '234ALPHA2342', 'hello']),
    ).to.not.equal('hey.yo[234ALPHA2342].hello');
    expect(formatParamOutput(['hey', 'yo', 'hello', 0])).to.equal(
      'hey.yo.hello[0]',
    );
    expect(formatParamOutput(['hey', 'yo', 'hello', 0, 0])).to.equal(
      'hey.yo.hello[0][0]',
    );
    expect(formatParamOutput(['hey', 'yo', 0, 'hello', 0, 0])).to.equal(
      'hey.yo[0].hello[0][0]',
    );
  });

  it('should return the original param if not an array', () => {
    expect(formatParamOutput('yo')).to.equal('yo');
  });
});
