package com.mint.entities;

import java.security.NoSuchAlgorithmException;

import com.mint.hasher.PasswordHasher;

public class Credentials {
	
	private int id;
	private String email;
	private String password;
	private String hashedPassword;
	
	public int getId() {
		return id;
	}
	public void setId(int id) {
		this.id = id;
	}
	public String getEmail() {
		return email;
	}
	public void setEmail(String email) {
		this.email = email;
	}
	public String getPassword() {
		return password;
	}
	public void setPassword(String password) {
		this.password = password;
	}
	public String getHashedPassword() {
		return hashedPassword;
	}
	public void setHashedPassword(String password) throws NoSuchAlgorithmException {
		this.hashedPassword = PasswordHasher.passwordHasher(password);
	}
	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		result = prime * result + ((email == null) ? 0 : email.hashCode());
		result = prime * result + ((hashedPassword == null) ? 0 : hashedPassword.hashCode());
		result = prime * result + id;
		result = prime * result + ((password == null) ? 0 : password.hashCode());
		return result;
	}
	@Override
	public boolean equals(Object obj) {
		if (this == obj)
			return true;
		if (obj == null)
			return false;
		if (getClass() != obj.getClass())
			return false;
		Credentials other = (Credentials) obj;
		if (email == null) {
			if (other.email != null)
				return false;
		} else if (!email.equals(other.email))
			return false;
		if (hashedPassword == null) {
			if (other.hashedPassword != null)
				return false;
		} else if (!hashedPassword.equals(other.hashedPassword))
			return false;
		if (id != other.id)
			return false;
		if (password == null) {
			if (other.password != null)
				return false;
		} else if (!password.equals(other.password))
			return false;
		return true;
	}
	@Override
	public String toString() {
		return "Credentials [id=" + id + ", email=" + email + ", password=" + password + ", hashedPassword="
				+ hashedPassword + "]";
	}
	public Credentials(int id, String email, String password, String hashedPassword) {
		super();
		this.id = id;
		this.email = email;
		this.password = password;
		this.hashedPassword = hashedPassword;
	}
	public Credentials() {
		super();
		// TODO Auto-generated constructor stub
	}
	
	
	

}
