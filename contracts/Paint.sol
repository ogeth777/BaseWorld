// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BaseEarthPaint {
    event Painted(uint256 indexed tileId, address indexed painter);

    // Approx 0.01 USD at $2500 ETH = 0.000004 ETH
    uint256 public constant PAINT_PRICE = 0.000004 ether;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function paint(uint256 tileId) external payable {
        require(msg.value >= PAINT_PRICE, "Insufficient ETH");
        
        // We just emit the event. The backend tracks the state.
        // This keeps gas minimal.
        emit Painted(tileId, msg.sender);
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
}
