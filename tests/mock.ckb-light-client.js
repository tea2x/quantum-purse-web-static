// Due to SharedArrayBuffer restriction effects on ckb-light-client-js, we provide
// this mock class to by pass all light-client related invocations in Karma tests.
class MockLightClient {
  constructor(inputBufferSize = 1024, outputBufferSize = 1024) {}

  async start(networkSetting, networkSecretKey, logLevel = 'info', transportType = 'ws') {
    return Promise.resolve();
  }

  async getTipHeader() {
    return Promise.resolve({
      number: '0x0'
    });
  }

  async setScripts(scripts, command) {
    return Promise.resolve();
  }

  async fetchTransaction(txHash) {
    return Promise.resolve();
  }
}

module.exports = {
  LightClient: MockLightClient,
  randomSecretKey: () => '0xmocksecretkey',
  LightClientSetScriptsCommand: {
    All: 0,
    Partial: 1,
    Delete: 2,
  }
};
