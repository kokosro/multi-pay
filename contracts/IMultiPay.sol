// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMultiPay {
   function spreadToken(IERC20,uint256,address[] memory) external;
   function spreadNative(address[] memory) external payable;
   function payNative(address[] memory, uint256[] memory) external payable;
   function payToken(IERC20, uint256, address[] memory, uint256[] memory) external;
}
