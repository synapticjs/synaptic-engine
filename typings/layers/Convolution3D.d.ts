import Network, { IBoundary, INetworkLayer } from '../Network';
export default class Convolution3D implements INetworkLayer {
    filter: number;
    stride: number;
    padding: number;
    layer: number[];
    constructor({filter, stride, padding}: {
        filter?: number;
        stride?: number;
        padding?: number;
    });
    init(network: Network, boundary: IBoundary): IBoundary;
    isValid(boundary: any, x: any, y: any, z: any): boolean;
}
