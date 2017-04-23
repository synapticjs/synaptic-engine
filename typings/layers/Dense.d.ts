import Network, { Boundary, Layer } from '../Network';
export default class Dense implements Layer {
    size: number;
    layer: number[];
    constructor(size: number);
    init(network: Network, boundary: Boundary): Boundary;
}
