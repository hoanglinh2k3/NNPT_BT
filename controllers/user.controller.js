const bcrypt = require("bcryptjs");
const { sql, pool, poolConnect } = require("../config/db");

exports.createUser = async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      fullName = "",
      avatarUrl = "https://i.sstatic.net/l60Hf.png",
      status = false,
      roleId = null,
      loginCount = 0,
    } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({
        message: "username, password, email are required",
      });
    }

    await poolConnect;

    const checkUser = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT * FROM Users
        WHERE (username = @username OR email = @email) AND isDeleted = 0
      `);

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({
        message: "Username or email already exists",
      });
    }

    if (roleId !== null) {
      const roleCheck = await pool
        .request()
        .input("roleId", sql.Int, roleId)
        .query(`
          SELECT * FROM Roles
          WHERE id = @roleId AND isDeleted = 0
        `);

      if (roleCheck.recordset.length === 0) {
        return res.status(400).json({ message: "Role not found" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, hashedPassword)
      .input("email", sql.NVarChar, email)
      .input("fullName", sql.NVarChar, fullName)
      .input("avatarUrl", sql.NVarChar, avatarUrl)
      .input("status", sql.Bit, status)
      .input("roleId", roleId === null ? sql.Int : sql.Int, roleId)
      .input("loginCount", sql.Int, loginCount)
      .query(`
        INSERT INTO Users(username, password, email, fullName, avatarUrl, status, roleId, loginCount)
        OUTPUT
          INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.fullName,
          INSERTED.avatarUrl, INSERTED.status, INSERTED.roleId, INSERTED.loginCount,
          INSERTED.createdAt, INSERTED.updatedAt
        VALUES(@username, @password, @email, @fullName, @avatarUrl, @status, @roleId, @loginCount)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT
        u.id, u.username, u.email, u.fullName, u.avatarUrl, u.status,
        u.roleId, u.loginCount, u.createdAt, u.updatedAt,
        r.name AS roleName,
        r.description AS roleDescription
      FROM Users u
      LEFT JOIN Roles r ON u.roleId = r.id AND r.isDeleted = 0
      WHERE u.isDeleted = 0
      ORDER BY u.id ASC
    `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(`
        SELECT
          u.id, u.username, u.email, u.fullName, u.avatarUrl, u.status,
          u.roleId, u.loginCount, u.createdAt, u.updatedAt,
          r.name AS roleName,
          r.description AS roleDescription
        FROM Users u
        LEFT JOIN Roles r ON u.roleId = r.id AND r.isDeleted = 0
        WHERE u.id = @id AND u.isDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    await poolConnect;

    const { id } = req.params;
    const {
      username,
      password,
      email,
      fullName,
      avatarUrl,
      status,
      roleId,
      loginCount,
    } = req.body;

    const userResult = await pool
      .request()
      .input("id", sql.Int, id)
      .query(`
        SELECT * FROM Users
        WHERE id = @id AND isDeleted = 0
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const current = userResult.recordset[0];

    if (username) {
      const checkUsername = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .input("id", sql.Int, id)
        .query(`
          SELECT * FROM Users
          WHERE username = @username AND id <> @id AND isDeleted = 0
        `);

      if (checkUsername.recordset.length > 0) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    if (email) {
      const checkEmail = await pool
        .request()
        .input("email", sql.NVarChar, email)
        .input("id", sql.Int, id)
        .query(`
          SELECT * FROM Users
          WHERE email = @email AND id <> @id AND isDeleted = 0
        `);

      if (checkEmail.recordset.length > 0) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    const nextRoleId = roleId !== undefined ? roleId : current.roleId;

    if (nextRoleId !== null) {
      const roleCheck = await pool
        .request()
        .input("roleId", sql.Int, nextRoleId)
        .query(`
          SELECT * FROM Roles
          WHERE id = @roleId AND isDeleted = 0
        `);

      if (roleCheck.recordset.length === 0) {
        return res.status(400).json({ message: "Role not found" });
      }
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : current.password;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("username", sql.NVarChar, username ?? current.username)
      .input("password", sql.NVarChar, hashedPassword)
      .input("email", sql.NVarChar, email ?? current.email)
      .input("fullName", sql.NVarChar, fullName ?? current.fullName)
      .input("avatarUrl", sql.NVarChar, avatarUrl ?? current.avatarUrl)
      .input("status", sql.Bit, status ?? current.status)
      .input("roleId", sql.Int, nextRoleId)
      .input("loginCount", sql.Int, loginCount ?? current.loginCount)
      .query(`
        UPDATE Users
        SET username = @username,
            password = @password,
            email = @email,
            fullName = @fullName,
            avatarUrl = @avatarUrl,
            status = @status,
            roleId = @roleId,
            loginCount = @loginCount,
            updatedAt = GETDATE()
        OUTPUT
          INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.fullName,
          INSERTED.avatarUrl, INSERTED.status, INSERTED.roleId, INSERTED.loginCount,
          INSERTED.createdAt, INSERTED.updatedAt
        WHERE id = @id
      `);

    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await poolConnect;

    const result = await pool
      .request()
      .input("id", sql.Int, req.params.id)
      .query(`
        UPDATE Users
        SET isDeleted = 1,
            updatedAt = GETDATE()
        WHERE id = @id AND isDeleted = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User soft deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.enableUser = async (req, res) => {
  try {
    const { email, username } = req.body;

    await poolConnect;

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("username", sql.NVarChar, username)
      .query(`
        UPDATE Users
        SET status = 1,
            updatedAt = GETDATE()
        OUTPUT
          INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.status
        WHERE email = @email
          AND username = @username
          AND isDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Invalid email or username" });
    }

    res.json({
      message: "User enabled successfully",
      user: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.disableUser = async (req, res) => {
  try {
    const { email, username } = req.body;

    await poolConnect;

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("username", sql.NVarChar, username)
      .query(`
        UPDATE Users
        SET status = 0,
            updatedAt = GETDATE()
        OUTPUT
          INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.status
        WHERE email = @email
          AND username = @username
          AND isDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Invalid email or username" });
    }

    res.json({
      message: "User disabled successfully",
      user: result.recordset[0],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};