// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StudentFees
 * @dev Smart contract for managing student fee payments
 * @notice Students can pay fees for different purposes, admin can monitor and withdraw
 */
contract StudentFees {
    address public owner;

    // Structure to store each payment
    struct Payment {
        uint256 amount;
        uint256 timestamp;
        string studentId;
        string feeType;
        address payer;
        bool confirmed;
    }

    // Array to store all payments
    Payment[] public allPayments;

    // Mapping to track payments per student
    mapping(string => mapping(string => uint256)) public studentPayments;

    // Events for monitoring
    event PaymentReceived(
        string indexed studentId,
        string indexed feeType,
        uint256 amount,
        address indexed payer,
        uint256 timestamp
    );

    event FundsWithdrawn(address indexed to, uint256 amount, uint256 timestamp);

    // Set deployer as owner
    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Student pays a fee
     * @param studentId Unique student identifier (e.g., "STU001")
     * @param feeType Type of fee (e.g., "Tuition", "Library", "Exam")
     */
    function payFee(string memory studentId, string memory feeType) public payable {
        require(msg.value > 0, "Must send a non-zero amount");
        require(bytes(studentId).length > 0, "Invalid student ID");
        require(bytes(feeType).length > 0, "Invalid fee type");

        // Create payment record
        allPayments.push(Payment({
            amount: msg.value,
            timestamp: block.timestamp,
            studentId: studentId,
            feeType: feeType,
            payer: msg.sender,
            confirmed: true
        }));

        // Track latest payment for this student+fee combo
        studentPayments[studentId][feeType] = allPayments.length;

        // Emit event for monitoring
        emit PaymentReceived(studentId, feeType, msg.value, msg.sender, block.timestamp);
    }

    /**
     * @notice Owner withdraws all collected funds
     */
    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
        emit FundsWithdrawn(owner, balance, block.timestamp);
    }

    /**
     * @notice Get current contract balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get total number of payments
     */
    function getPaymentCount() public view returns (uint256) {
        return allPayments.length;
    }

    /**
     * @notice Get payment details by index
     */
    function getPayment(uint256 index) public view returns (
        string memory studentId,
        string memory feeType,
        uint256 amount,
        uint256 timestamp,
        address payer,
        bool confirmed
    ) {
        require(index < allPayments.length, "Invalid index");
        Payment memory p = allPayments[index];
        return (p.studentId, p.feeType, p.amount, p.timestamp, p.payer, p.confirmed);
    }

    /**
     * @notice Check if a student has paid a specific fee
     */
    function hasPaid(string memory studentId, string memory feeType) public view returns (bool) {
        return studentPayments[studentId][feeType] > 0;
    }

    /**
     * @notice Transfer ownership to a new address
     */
    function transferOwnership(address newOwner) public {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
