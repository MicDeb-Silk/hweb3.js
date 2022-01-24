/* eslint-disable max-classes-per-file */

import { Numbers, Web3Error } from 'web3-utils';

export class InvalidTransactionWithSender extends Web3Error {
	public constructor(value: unknown) {
		super(JSON.stringify(value), 'invalid transaction with sender');
	}
}

export class InvalidTransactionCall extends Web3Error {
	public constructor(value: unknown) {
		super(JSON.stringify(value), 'invalid transaction call');
	}
}

export class MissingCustomChainError extends Web3Error {
	public constructor() {
		super(
			'MissingCustomChainError',
			'If tx.common is provided it must have tx.common.customChain',
		);
	}
}

export class MissingCustomChainIdError extends Web3Error {
	public constructor() {
		super(
			'MissingCustomChainIdError',
			'If tx.common is provided it must have tx.common.customChain and tx.common.customChain.chainId',
		);
	}
}

export class ChainIdMismatchError extends Web3Error {
	public constructor(value: { txChainId: unknown; customChainId: unknown }) {
		super(
			JSON.stringify(value),
			'Chain Id doesnt match in tx.chainId tx.common.customChain.chainId',
		);
	}
}

export class CommonOrChainAndHardforkError extends Web3Error {
	public constructor() {
		super(
			'CommonOrChainAndHardforkError',
			'Please provide the @ethereumjs/common object or the chain and hardfork property but not all together.',
		);
	}
}

export class MissingChainOrHardforkError extends Web3Error {
	public constructor(value: { chain: string | undefined; hardfork: string | undefined }) {
		super(
			'MissingChainOrHardforkError',
			`When specifying chain and hardfork, both values must be defined. Received "chain": ${
				value.chain ?? 'undefined'
			}, "hardfork": ${value.hardfork ?? 'undefined'}`,
		);
	}
}

export class MissingGasError extends Web3Error {
	public constructor(value: {
		gas: Numbers | undefined;
		gasLimit: Numbers | undefined;
		maxPriorityFeePerGas: Numbers | undefined;
		maxFeePerGas: Numbers | undefined;
	}) {
		super(
			`gas: ${value.gas ?? 'undefined'}, gasLimit: ${
				value.gasLimit ?? 'undefined'
			}, maxPriorityFeePerGas: ${value.maxPriorityFeePerGas ?? 'undefined'}, maxFeePerGas: ${
				value.maxFeePerGas ?? 'undefined'
			}`,
			'"gas" is missing',
		);
	}
}

export class InvalidGasOrGasPrice extends Web3Error {
	public constructor(value: { gas: Numbers | undefined; gasPrice: Numbers | undefined }) {
		super(
			`gas: ${value.gas ?? 'undefined'}, gasPrice: ${value.gasPrice ?? 'undefined'}`,
			'Gas or gasPrice is lower than 0',
		);
	}
}

export class InvalidMaxPriorityFeePerGasOrMaxFeePerGas extends Web3Error {
	public constructor(value: {
		maxPriorityFeePerGas: Numbers | undefined;
		maxFeePerGas: Numbers | undefined;
	}) {
		super(
			`maxPriorityFeePerGas: ${value.maxPriorityFeePerGas ?? 'undefined'}, maxFeePerGas: ${
				value.maxFeePerGas ?? 'undefined'
			}`,
			'maxPriorityFeePerGas or maxFeePerGas is lower than 0',
		);
	}
}

export class Eip1559GasPriceError extends Web3Error {
	public constructor(value: unknown) {
		super(value, "eip-1559 transactions don't support gasPrice");
	}
}

export class UnsupportedFeeMarketError extends Web3Error {
	public constructor(value: {
		maxPriorityFeePerGas: Numbers | undefined;
		maxFeePerGas: Numbers | undefined;
	}) {
		super(
			`maxPriorityFeePerGas: ${value.maxPriorityFeePerGas ?? 'undefined'}, maxFeePerGas: ${
				value.maxFeePerGas ?? 'undefined'
			}`,
			"pre-eip-1559 transaction don't support maxFeePerGas/maxPriorityFeePerGas",
		);
	}
}

export class InvalidTransactionObjectError extends Web3Error {
	public constructor(value: unknown) {
		super(value, 'invalid transaction object');
	}
}

export class InvalidNonceOrChainIdError extends Web3Error {
	public constructor(value: { nonce: Numbers | undefined; chainId: Numbers | undefined }) {
		super(
			`nonce: ${value.nonce ?? 'undefined'}, chainId: ${value.chainId ?? 'undefined'}`,
			'Nonce or chainId is lower than 0',
		);
	}
}

export class UnableToPopulateNonceError extends Web3Error {
	public constructor() {
		super('UnableToPopulateNonceError', 'unable to populate nonce, no from address available');
	}
}

export class Eip1559NotSupportedError extends Web3Error {
	public constructor() {
		super('Eip1559NotSupportedError', "Network doesn't support eip-1559");
	}
}

export class UnsupportedTransactionTypeError extends Web3Error {
	public constructor(value: unknown) {
		super(value, 'unsupported transaction type');
	}
}