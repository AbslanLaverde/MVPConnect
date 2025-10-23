package com.mint.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Custom UserDetailsService implementation
 * Loads user data from Neo4j for authentication
 *
 * Note: This is a placeholder implementation. Once we create the Node entities
 * and repositories, this will be updated to actually query Neo4j.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    // TODO: Inject repositories once they're created
    // @Autowired
    // private MusicianRepository musicianRepository;
    // @Autowired
    // private PromoterRepository promoterRepository;
    // @Autowired
    // private VenueRepository venueRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        // TODO: Implementation will be completed after we create Neo4j nodes and repositories
        // For now, this is a placeholder that will be updated in the next phase

        // The logic will be:
        // 1. Try to find user in Musician repository by email
        // 2. If not found, try Promoter repository
        // 3. If not found, try Venue repository
        // 4. If not found in any, throw UsernameNotFoundException
        // 5. Return CustomUserDetails with the found user's info

        /*
        Example implementation (to be added later):

        Optional<Musician> musician = musicianRepository.findByEmail(email);
        if (musician.isPresent()) {
            Musician m = musician.get();
            return new CustomUserDetails(m.getId(), m.getEmail(), m.getPassword(), "MUSICIAN");
        }

        Optional<Promoter> promoter = promoterRepository.findByEmail(email);
        if (promoter.isPresent()) {
            Promoter p = promoter.get();
            return new CustomUserDetails(p.getId(), p.getEmail(), p.getPassword(), "PROMOTER");
        }

        Optional<Venue> venue = venueRepository.findByEmail(email);
        if (venue.isPresent()) {
            Venue v = venue.get();
            return new CustomUserDetails(v.getId(), v.getEmail(), v.getPassword(), "VENUE");
        }
        */

        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}

