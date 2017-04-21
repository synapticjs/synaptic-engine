import Network, { IBoundary, INetworkLayer } from '../Network'

export default class Input implements INetworkLayer {
  constructor(public size: number) { }

  init(network: Network, boundary: IBoundary): IBoundary {

    if (boundary != null) {
      throw new Error('\'Input\' must be the first layer of the network!')
    }

    let layer = network.addLayer(this.size)
    // set the boundary for next layer
    return {
      width: this.size,
      height: 1,
      depth: 1,
      layer: layer
    }
  }
}