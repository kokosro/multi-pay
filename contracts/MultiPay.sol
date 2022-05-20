// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {Destroyable} from "./Destroyable.sol";
import {IMultiPay} from "./IMultiPay.sol";

contract MultiPay is IMultiPay, Destroyable, Initializable {
    using SafeMath for uint256;

    function initialize() public initializer {
        // nothing to do;
    }

    function _fillToken(IERC20 token, uint256 totalAmount) internal {
        uint256 selfBalance = token.balanceOf(address(this));
        
        if (totalAmount > selfBalance) {
            uint256 remaining = totalAmount.sub(selfBalance);
            if (
                token.allowance(msg.sender, address(this)) >= remaining &&
                token.balanceOf(msg.sender) >= remaining
            ) {
                token.transferFrom(msg.sender, address(this), remaining);
            } else {
                revert("Not enough balance");
            }
        }
    }
    
    /*
      will send an equal amount of ERC20 tokens for each destination
      any remainig token dust will be sent back to sender
     */
    function spreadToken(
        IERC20 token,
        uint256 totalAmount,
        address[] memory destinations
    ) external override onlyOwner {
        require(destinations.length > 0, "No destination");
        _fillToken(token, totalAmount);

        uint256 perDestination = totalAmount.div(destinations.length);
        for (uint256 i = 0; i < destinations.length; i++) {
            token.transfer(destinations[i], perDestination);
        }
        uint256 selfBalance = token.balanceOf(address(this));
        if (selfBalance > 0) {
            token.transfer(msg.sender, selfBalance);
        }
    }
    /*
      will send an equal amount of ether to all destinations
      any remaining dust will be sent back to sender
     */
    function spreadNative(address[] memory destinations)
        external
        override
        payable
        onlyOwner
    {
        require(destinations.length > 0, "No destination");
        require(msg.value > 0, "Nothing to send");
        uint256 perDestination = msg.value.div(destinations.length);
        require(perDestination > 0, "Nothing per destination");
        for (uint256 i = 0; i < destinations.length; i++) {
            payable(destinations[i]).transfer(perDestination);
        }
        uint256 selfBalance = address(this).balance;
        if (selfBalance > 0) {
            payable(msg.sender).transfer(selfBalance);
        }
    }
    /*
      will send ether amount to the corresponding destination
      if call value is not enough to cover all payments will refund the remaining and will ignore the rest of the destinations for which there are not enough funds.
     */
    function payNative(address[] memory destinations, uint256[] memory amounts)
        external
        override
        payable
        onlyOwner
    {
        require(destinations.length > 0, "No destination");
        require(destinations.length == amounts.length, "Invalid lengths");
        require(msg.value > 0, "Nothing to send");

        for(uint256 i = 0; i < destinations.length; i++){
            if(address(this).balance >= amounts[i]){
                payable(destinations[i]).transfer(amounts[i]);
            }
        }
        uint256 selfBalance = address(this).balance;
        if (selfBalance > 0) {
            payable(msg.sender).transfer(selfBalance);
        }
    }
    /*
      will send token amount corresponding to each destination
      if totalAmount doesn't cover for all transfers, will revert
     */
    function payToken(
        IERC20 token,
        uint256 totalAmount,
        address[] memory destinations,
        uint256[] memory amounts
    ) external override onlyOwner {
        require(destinations.length > 0, "No destination");
        require(destinations.length == amounts.length, "Invalid lengths");
        _fillToken(token, totalAmount);
        uint256 remainingBalance = totalAmount;
        for (uint256 i = 0; i < destinations.length; i++) {
            if(remainingBalance >= amounts[i]){
                token.transfer(destinations[i], amounts[i]);
                remainingBalance = remainingBalance.sub(amounts[i]);
            } else {
                revert("Total amount provided is lower than required destinations amounts sum");
            }
        }
        uint256 selfBalance = token.balanceOf(address(this));
        if (selfBalance > 0) {
            token.transfer(msg.sender, selfBalance);
        }
    }
}
