using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Dapper;
using BCrypt.Net;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("GlobalConfig.json", optional: false, reloadOnChange: true);
builder.Services.AddControllers();
builder.Services.AddScoped<DataConnection>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();
app.UseCors("AllowAll");
app.MapControllers();
app.Run();

public class DataConnection
{
    private readonly IConfiguration _configuration;
    public DataConnection(IConfiguration configuration) => _configuration = configuration;

    public SqlConnection GetConnection()
    {
        var conn = new SqlConnection(_configuration.GetConnectionString("DefaultConnection"));
        conn.Open();
        return conn;
    }
}

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly DataConnection _dataConnection;
    public UserController(DataConnection dataConnection) => _dataConnection = dataConnection;

    // GET api/user
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var conn = _dataConnection.GetConnection();
        var users = await conn.QueryAsync<User>("SELECT * FROM Users");
        return Ok(users);
    }

    // POST api/user/register — hashes password, inserts user, returns new UserID
    [HttpPost("register")]
    public async Task<IActionResult> CreateUser(User user)
    {
        var conn = _dataConnection.GetConnection();
        var hashedPassword = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);

        var newId = await conn.ExecuteScalarAsync<int>(
            "INSERT INTO Users (name, email, passwordHash) OUTPUT INSERTED.id VALUES (@Name, @Email, @PasswordHash)",
            new { Name = user.Name, Email = user.Email, PasswordHash = hashedPassword }
        );
        return Ok(new { message = "User registered successfully!", userId = newId });
    }

    [HttpPost("login")]
    public async Task<IActionResult> LoginUser(LoginDto dto)
    {
        var conn = _dataConnection.GetConnection();
        var existingUser = await conn.QuerySingleOrDefaultAsync<User>(
            "SELECT * FROM Users WHERE email = @Email",
            new { dto.Email }
        );

        if (existingUser == null)
            return Unauthorized(new { message = "User Email Not Found" });

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, existingUser.PasswordHash))
            return Unauthorized(new { message = "Invalid Password" });

        // Fetch the AccountID from UserAccounts
        var conn2 = _dataConnection.GetConnection();
        var accountId = await conn2.ExecuteScalarAsync<int?>(
            "SELECT AccountID FROM UserAccounts WHERE UserID = @UserID",
            new { UserID = existingUser.Id }
        );

        return Ok(new { message = "Login successful!", userId = existingUser.Id, accountId, name = existingUser.Name });
    }

    // POST api/user/accountsetup — links account details to a registered UserID
    [HttpPost("accountsetup")]
    public async Task<IActionResult> AccountSetup(UserAccountDto dto)
    {
        var conn = _dataConnection.GetConnection();

        var userExists = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(1) FROM Users WHERE id = @UserID",
            new { dto.UserID }
        );
        if (userExists == 0)
            return BadRequest(new { message = "Invalid UserID — please register first." });

        if (dto.PIN != dto.ConfirmPIN)
            return BadRequest(new { message = "PINs do not match." });

        var hashedPin = BCrypt.Net.BCrypt.HashPassword(dto.PIN);

        // Step 1: Insert into UserAccounts, get back the new AccountID
        var newAccountId = await conn.ExecuteScalarAsync<int>(
            @"INSERT INTO UserAccounts
              (UserID, FirstName, LastName, PhoneNumber, [Address], City, [State], ZipCode, InitialDeposit, HashedPIN)
              OUTPUT INSERTED.AccountID
              VALUES
              (@UserID, @FirstName, @LastName, @PhoneNumber, @Address, @City, @State, @ZipCode, @InitialDeposit, @HashedPIN)",
            new {
                dto.UserID, dto.FirstName, dto.LastName, dto.PhoneNumber,
                dto.Address, dto.City, dto.State, dto.ZipCode, dto.InitialDeposit,
                HashedPIN = hashedPin
            }
        );

        // Step 2: Seed the first Transaction row (Initial Deposit)
        await conn.ExecuteAsync(
            @"INSERT INTO Transactions (AccountID, UserID, Amount, TransactionType, BalanceAfter, Description)
              VALUES (@AccountID, @UserID, @Amount, 'Deposit', @BalanceAfter, 'Initial Deposit')",
            new {
                AccountID  = newAccountId,
                UserID     = dto.UserID,
                Amount     = dto.InitialDeposit,
                BalanceAfter = dto.InitialDeposit   // starting balance = initial deposit
            }
        );

        return Ok(new { message = "Account setup complete!", accountId = newAccountId });
    }

    // GET api/user/dashboard/{userId} — account info + current balance + recent transactions
    [HttpGet("dashboard/{userId}")]
    public async Task<IActionResult> GetDashboard(int userId)
    {
        var conn = _dataConnection.GetConnection();

        var row = await conn.QuerySingleOrDefaultAsync(
            @"SELECT ua.AccountID, ua.FirstName, ua.LastName, ua.PhoneNumber,
                     u.email,
                     ISNULL(t.BalanceAfter, 0) AS Balance
              FROM UserAccounts ua
              JOIN Users u ON u.id = ua.UserID
              OUTER APPLY (
                  SELECT TOP 1 BalanceAfter FROM Transactions
                  WHERE AccountID = ua.AccountID ORDER BY CreatedAt DESC
              ) t
              WHERE ua.UserID = @UserID",
            new { UserID = userId }
        );
        if (row == null)
            return NotFound(new { message = "Account not found." });

        // Explicitly project into camelCase so the React frontend can access properties directly
        var account = new {
            accountId   = (int)row.AccountID,
            firstName   = (string)row.FirstName,
            lastName    = (string)row.LastName,
            phoneNumber = (string)row.PhoneNumber,
            email       = (string)row.email,
            balance     = (decimal)row.Balance
        };

        var txRows = await conn.QueryAsync(
            @"SELECT TransactionID, Amount, TransactionType, BalanceAfter, Description, CreatedAt
              FROM Transactions
              WHERE UserID = @UserID
              ORDER BY CreatedAt DESC",
            new { UserID = userId }
        );

        // Project transactions into camelCase too
        var transactions = txRows.Select(t => new {
            transactionId   = (int)t.TransactionID,
            amount          = (decimal)t.Amount,
            transactionType = (string)t.TransactionType,
            balanceAfter    = (decimal)t.BalanceAfter,
            description     = (string)t.Description,
            createdAt       = (DateTime)t.CreatedAt
        });

        return Ok(new { account, transactions });
    }

    // POST api/user/deposit
    [HttpPost("deposit")]
    public async Task<IActionResult> Deposit(TransactionDto dto)
    {
        var conn = _dataConnection.GetConnection();

        // Verify PIN first
        var hashedPin = await conn.ExecuteScalarAsync<string>(
            "SELECT HashedPIN FROM UserAccounts WHERE AccountID = @AccountID",
            new { dto.AccountID }
        );
        if (hashedPin == null)
            return NotFound(new { message = "Account not found." });
        if (!BCrypt.Net.BCrypt.Verify(dto.PIN, hashedPin))
            return Unauthorized(new { message = "Incorrect PIN." });

        var currentBalance = await conn.ExecuteScalarAsync<decimal?>(
            "SELECT TOP 1 BalanceAfter FROM Transactions WHERE AccountID = @AccountID ORDER BY CreatedAt DESC",
            new { dto.AccountID }
        );

        if (dto.Amount <= 0)
            return BadRequest(new { message = "Deposit amount must be greater than zero." });

        var newBalance = currentBalance.GetValueOrDefault(0) + dto.Amount;

        await conn.ExecuteAsync(
            @"INSERT INTO Transactions (AccountID, UserID, Amount, TransactionType, BalanceAfter, Description)
              VALUES (@AccountID, @UserID, @Amount, 'Deposit', @BalanceAfter, @Description)",
            new { dto.AccountID, dto.UserID, dto.Amount, BalanceAfter = newBalance, Description = dto.Description ?? "Deposit" }
        );
        return Ok(new { message = "Deposit successful!", newBalance });
    }

    // POST api/user/withdraw
    [HttpPost("withdraw")]
    public async Task<IActionResult> Withdraw(TransactionDto dto)
    {
        var conn = _dataConnection.GetConnection();

        // Verify PIN first
        var hashedPin = await conn.ExecuteScalarAsync<string>(
            "SELECT HashedPIN FROM UserAccounts WHERE AccountID = @AccountID",
            new { dto.AccountID }
        );
        if (hashedPin == null)
            return NotFound(new { message = "Account not found." });
        if (!BCrypt.Net.BCrypt.Verify(dto.PIN, hashedPin))
            return Unauthorized(new { message = "Incorrect PIN." });

        var currentBalance = await conn.ExecuteScalarAsync<decimal?>(
            "SELECT TOP 1 BalanceAfter FROM Transactions WHERE AccountID = @AccountID ORDER BY CreatedAt DESC",
            new { dto.AccountID }
        );

        if (dto.Amount <= 0)
            return BadRequest(new { message = "Withdrawal amount must be greater than zero." });

        if (dto.Amount > currentBalance.GetValueOrDefault(0))
            return BadRequest(new { message = "Insufficient funds." });

        var newBalance = currentBalance.GetValueOrDefault(0) - dto.Amount;

        await conn.ExecuteAsync(
            @"INSERT INTO Transactions (AccountID, UserID, Amount, TransactionType, BalanceAfter, Description)
              VALUES (@AccountID, @UserID, @Amount, 'Withdraw', @BalanceAfter, @Description)",
            new { dto.AccountID, dto.UserID, dto.Amount, BalanceAfter = newBalance, Description = dto.Description ?? "Withdrawal" }
        );
        return Ok(new { message = "Withdrawal successful!", newBalance });
    }
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
}

public class LoginDto
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class UserAccountDto
{
    public int UserID { get; set; }
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string PhoneNumber { get; set; }
    public string Address { get; set; }
    public string City { get; set; }
    public string State { get; set; }
    public string ZipCode { get; set; }
    public decimal InitialDeposit { get; set; }
    public string PIN { get; set; }
    public string ConfirmPIN { get; set; }
}

public class TransactionDto
{
    public int AccountID { get; set; }
    public int UserID { get; set; }
    public decimal Amount { get; set; }
    public string Description { get; set; }
    public string PIN { get; set; }  // Plain PIN for verification
}
