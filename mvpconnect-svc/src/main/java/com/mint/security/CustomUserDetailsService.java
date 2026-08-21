package com.mint.security;

import com.mint.nodes.Musician;
import com.mint.nodes.Promoter;
import com.mint.nodes.Venue;
import com.mint.repositories.MusicianRepository;
import com.mint.repositories.PromoterRepository;
import com.mint.repositories.VenueRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Custom UserDetailsService implementation
 * Searches all three user type repositories (Musician, Promoter, Venue) to find users during login
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private MusicianRepository musicianRepository;

    @Autowired
    private PromoterRepository promoterRepository;

    @Autowired
    private VenueRepository venueRepository;

    /**
     * Load user by email (username)
     * Searches Musician → Promoter → Venue repositories in order
     *
     * @param email the user's email address
     * @return CustomUserDetails containing user info
     * @throws UsernameNotFoundException if user not found in any repository
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        // Try to find in Musician repository
        Optional<Musician> musician = musicianRepository.findByEmail(email);
        if (musician.isPresent()) {
            Musician m = musician.get();
            return new CustomUserDetails(
                m.getId(),
                m.getEmail(),
                m.getPassword(),
                "MUSICIAN"
            );
        }

        // Try to find in Promoter repository
        Optional<Promoter> promoter = promoterRepository.findByEmail(email);
        if (promoter.isPresent()) {
            Promoter p = promoter.get();
            return new CustomUserDetails(
                p.getId(),
                p.getEmail(),
                p.getPassword(),
                "PROMOTER"
            );
        }

        // Try to find in Venue repository
        Optional<Venue> venue = venueRepository.findByEmail(email);
        if (venue.isPresent()) {
            Venue v = venue.get();
            return new CustomUserDetails(
                v.getId(),
                v.getEmail(),
                v.getPassword(),
                "VENUE"
            );
        }

        // User not found in any repository
        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}

